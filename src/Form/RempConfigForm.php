<?php

namespace Drupal\remp\Form;

use Drupal\Core\Form\ConfigFormBase;
use Drupal\Core\Form\FormStateInterface;

/**
 * REMP Configuration form.
 */
class RempConfigForm extends ConfigFormBase {

  /**
   * {@inheritdoc}
   */
  protected function getEditableConfigNames() {
    return [
      'remp.config',
    ];
  }

  /**
   * {@inheritdoc}
   */
  public function getFormId() {
    return 'remp_config_form';
  }

  /**
   * {@inheritdoc}
   */
  public function buildForm(array $form, FormStateInterface $form_state) {
    $config = $this->config('remp.config');

    $form['host'] = [
      '#type' => 'textfield',
      '#title' => $this->t('Remp Host'),
      '#description' => $this->t('Url to the REMP instance.'),
      '#default_value' => $config->get('host'),
    ];

    $form['funnel'] = [
      '#type' => 'textfield',
      '#title' => $this->t('REMP Sales funnel'),
      '#description' => $this->t('The name of the sales funnel to use for new subscription.'),
      '#default_value' => $config->get('funnel'),
    ];

    return parent::buildForm($form, $form_state);
  }

  /**
   * {@inheritdoc}
   */
  public function submitForm(array &$form, FormStateInterface $form_state) {
    parent::submitForm($form, $form_state);

    $this->config('remp.config')
      ->set('host', rtrim($form_state->getValue('host'), '/'))
      ->set('funnel', $form_state->getValue('funnel'))
      ->save();
  }

}
