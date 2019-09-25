(function ($, Drupal, drupalSettings) {

  'use strict';

  Drupal.behaviors.Remp = {

    apiUrl: drupalSettings.remp.host ? drupalSettings.remp.host + '/api/v1' : false,

    tokenData: {
      n_email: '',
      n_token: '',
    },

    // Attach behavior.
    attach: function(context, settings) {
      let REMP = this;
      if (REMP.apiUrl) {
        $('body', context).once('remp').each(function(){
          // Check user login status and display accessible content.
          REMP.checkStatus(REMP.showContent.bind(REMP), REMP.showLogin.bind(REMP));
        });
      }
    },

    // Init remp elements.
    init : function() {
      this.memberContent = $('#remp-member');
      this.anonymContent = $('#remp-anonym');
    },

    // Check user login status and calls appropriate callaback.
    checkStatus: function(successCallback, failCallback) {
      let REMP = this;
      let valid = false;
      REMP.getTokenData();

      // If we already have a token, check if its valid.
      if (REMP.tokenData.n_token) {
        $.ajax({
          method: 'GET',
          url: REMP.apiUrl + '/user/info',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + REMP.tokenData.n_token
          }
        }).done(function (response) {
          // If valid, check for subscriptions.
          if (response.status == 'ok') {
            $.ajax({
              method: 'POST',
              url: REMP.apiUrl + '/users/subscriptions',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': 'Bearer ' + REMP.tokenData.n_token
              }

            }).done(function (response) {
              let activeSub = false;
              for (let i in response.subscriptions) {
                let sub = response.subscriptions[i];

                // Check for active subscription with access to "web"
                if (new Date() > new Date(sub.start_at) && sub.access.indexOf('web') > -1) {
                  activeSub = true;
                }
              }

              if (activeSub) {
                successCallback();
              } else {
                failCallback(true);
              }
            }).fail(function (jqXHR, textStatus) {
              if (textStatus === 'timeout') {
                console.error("server timeout");
              } else {
                console.error("server error");
              }
              failCallback();
            });
          } else {
            failCallback();
          }
        }).fail(function (jqXHR, textStatus) {
          if (textStatus === 'timeout') {
            console.error("server timeout");
          } else {
            console.error("server error");
          }
          failCallback();
        });
      } else {
        failCallback();
      }
    },

    // Reads relevant cookies.
    getTokenData: function () {
      this.tokenData = {
        n_email: $.cookie('n_email'),
        n_token: $.cookie('n_token'),
      }
    },

    // Displays restricted content.
    showContent: function() {
      if (this.memberContent.length) {
        this.anonymContent.hide();
        this.memberContent.show();
      }
    },

    // Hides restricted content.
    hideContent: function () {
      if (this.memberContent.length) {
        this.anonymContent.show();
        this.memberContent.hide();
      }
    },

    // Shows login options for anonymous users or logged in users with no
    // subscription.
    showLogin: function(loggedIn) {
      let REMP = this;
      let funnel = drupalSettings.remp.funnel;

      if (REMP.memberContent.length) {
        if (loggedIn) {
          REMP.anonymContent.append($('<h3>').text(Drupal.t("You don't have active subscription for this content.")));
          REMP.anonymContent.append($('<a/>', { href: drupalSettings.remp.host + '/sales-funnel/sales-funnel-frontend/free?funnel=' + funnel + '&destination=' + window.location.href, target: '_blank' }).text(Drupal.t('Apply for subscription to view full content')));
        } else {
          REMP.buildForm();
          REMP.anonymContent.append($('<h3>').text(Drupal.t("Not a member?")));
          REMP.anonymContent.append($('<a/>', { href: drupalSettings.remp.host + '/sales-funnel/sales-funnel-frontend/free?funnel=' + funnel + '&destination=' + window.location.href, target: '_blank' }).text(Drupal.t('Register Here')));
        }
      }
    },

    // Builds Login form
    buildForm: function() {
      let REMP = this;
      let $form = $('<form/>', { id: 'remp-login-form' });
      let $email = $('<input/>', { type: 'text', id: 'remp-email', name:'remp-email' });
      let $pass = $('<input/>', { type: 'password', id: 'remp-pass', name: 'remp-pass' });
      let $submit = $('<input/>', { type: 'submit', value: Drupal.t('Log in') }).addClass('button js-form-submit form-submit');
      let $errorContainer = $('<div/>');

      $form
        .append($('<h3>').text(Drupal.t("You don't have permission to access this content")))
        .append($errorContainer)
        .append(
          $('<div/>').addClass('form-item')
            .append($('<label>', {for: $email.attr('id')}).text(Drupal.t('Email') + ':'))
            .append($email)
        )
        .append(
          $('<div/>').addClass('form-item')
            .append($('<label>', { for: $pass.attr('id') }).text(Drupal.t('Password') + ':'))
            .append($pass)
        )
        .append($submit);

      // Handling form submission.
      $form.submit(function(e) {
        e.preventDefault();

        $.ajax({
          method: 'POST',
          url: REMP.apiUrl + '/users/login',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'Accept': 'application/json'
          },
          data: {
            email: $email.val(),
            password: $pass.val()
          }
        }).done(function(response) {
          // Set valid cookies and reload the page after login.
          if (response.status == 'ok') {
            $.cookie('n_token', response.access.token, { domain: '.' + window.location.hostname, path:'/' });
            $.cookie('n_email', response.user.email, { domain: '.' + window.location.hostname, path: '/' });
            window.location.reload();
          }
        }).fail(function (jqXHR, textStatus) {
          if (textStatus === 'timeout') {
            console.error("server timeout");
          } else {
            // Display status messages for failed login attempts.
            if (
              jqXHR.responseJSON.error == 'auth_failed'
              || jqXHR.responseJSON.error == 'no_email'
              || jqXHR.responseJSON.error == 'no_password'
              ) {
              $errorContainer.html('');
              $errorContainer.append(
                $('<div/>').addClass('messages__wrapper')
                  .append($('<div/>').addClass('messages messages--error').text(jqXHR.responseJSON.message))
              );
            } else {
              console.error(jqXHR.responseJSON.error);
            }
          }
        });

      });

      REMP.anonymContent.append($form);
    }
  };

  // Initialize Remp and hide content.
  Drupal.behaviors.Remp.init();
  Drupal.behaviors.Remp.hideContent();

})(jQuery, Drupal, drupalSettings);