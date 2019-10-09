<?php

namespace Drupal\remp\Controller;

use Drupal\Component\Serialization\Json;
use Drupal\Core\Access\AccessResult;
use Drupal\Core\Ajax\AjaxResponse;
use Drupal\Core\Ajax\AppendCommand;
use Drupal\Core\Ajax\HtmlCommand;
use Drupal\Core\Controller\ControllerBase;
use Drupal\Core\Entity\EntityTypeManagerInterface;
use Drupal\Core\Render\RendererInterface;
use Drupal\Core\Session\AccountInterface;
use GuzzleHttp\ClientInterface;
use Symfony\Component\DependencyInjection\ContainerInterface;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * RempContentController implementation.
 */
class RempContentController extends ControllerBase {

  /**
   * EntityTypeManager.
   *
   * @var \Drupal\Core\Entity\EntityTypeManager
   */
  protected $entityTypeManager;

  /**
   * Renderer.
   *
   * @var Drupal\Core\Render\Renderer
   */
  protected $renderer;

  /**
   * Guzzle Http Client.
   *
   * @var \GuzzleHttp\Client
   */
  protected $httpClient;

  /**
   * {@inheritdoc}
   */
  public static function create(ContainerInterface $container) {
    return new static(
      $container->get('entity_type.manager'),
      $container->get('renderer'),
      $container->get('http_client')
    );
  }

  /**
   * {@inheritdoc}
   *
   * @param \Drupal\Core\Entity\EntityTypeManagerInterface $entity_type_manager
   *   Entity Type manager.
   * @param \Drupal\Core\Render\RendererInterface $renderer
   *   Renderer.
   * @param \GuzzleHttp\ClientInterface $http_client
   *   HTTP Client.
   */
  public function __construct(EntityTypeManagerInterface $entity_type_manager, RendererInterface $renderer, ClientInterface $http_client) {
    $this->entityTypeManager = $entity_type_manager;
    $this->renderer = $renderer;
    $this->httpClient = $http_client;
  }

  /**
   * Returns restricted content.
   */
  public function content($entity_type, $entity_id) {
    $definitions = $this->entityTypeManager->getDefinitions();

    if (isset($definitions[$entity_type])) {
      $entityStorage = $this->entityTypeManager->getStorage($entity_type);

      if ($entity = $entityStorage->load($entity_id)) {
        /** @var \Drupal\Core\Entity\EntityViewBuilderInterface $view_builder */
        $viewBuilder = $this->entityTypeManager
          ->getViewBuilder($entity_type);

        $view = $viewBuilder->view($entity, 'full');

        $response = new AjaxResponse();

        $selector = '#remp-member';

        $response->addCommand(new HtmlCommand($selector, ''));
        $response->addCommand(new AppendCommand($selector, $this->renderer->render($view)));

        return $response;
      }
      else {
        throw new NotFoundHttpException();
      }
    }
    else {
      throw new NotFoundHttpException();
    }
  }

  /**
   * Checks access to content via REMP API.
   */
  public function access(AccountInterface $account, $entity_type, $entity_id) {
    $hasSubscription = FALSE;
    $config = $this->config('remp.config');
    $api_url = $config->get('host') . '/api/v1';

    if (empty($_COOKIE['n_token'])) {
      $hasSubscription = FALSE;
    }
    else {
      // Check if user has access to the content.
      $sub_request = $this->httpClient->request('GET', $api_url . '/users/subscriptions', [
        'headers' => [
          'Content-Type' => 'application/x-www-form-urlencoded',
          'Authorization' => 'Bearer ' . $_COOKIE['n_token'],
        ],
      ]);

      if ($sub_request->getStatusCode() == 200) {
        $body = Json::decode($sub_request->getBody()->getContents());

        // Search for active subscription with access to 'web'.
        foreach ($body['subscriptions'] as $subscription) {
          if (in_array('web', $subscription['access'])) {
            $start_date = new \DateTime($subscription['start_at']);
            if ($start_date->getTimestamp() < time()) {
              $hasSubscription = TRUE;
              break;
            }
          }
        }
      }
    }

    return AccessResult::allowedIf($hasSubscription);
  }

}
