(($, Drupal, drupalSettings) => {
  Drupal.behaviors.Remp = {
    apiUrl: drupalSettings.remp.host
      ? `${drupalSettings.remp.host}/api/v1`
      : false,

    tokenData: {
      n_email: "",
      n_token: ""
    },

    settings: {},

    // Attach behavior.
    attach(context, settings) {
      const REMP = this;
      this.settings = settings.remp;

      if (REMP.apiUrl) {
        $("body", context)
          .once("remp")
          .each(() => {
            // Check user login status and display accessible content.
            REMP.checkStatus(
              REMP.showContent.bind(REMP),
              REMP.showLogin.bind(REMP)
            );
          });
      }
    },

    // Init remp elements.
    init() {
      this.memberContent = $("#remp-member");
      this.anonymContent = $("#remp-anonym");
      this.getTokenData();
      this.hideContent();
    },

    // Check user login status and calls appropriate callaback.
    checkStatus(successCallback, failCallback) {
      const REMP = this;

      // If we already have a token, check if its valid.
      if (REMP.tokenData.n_token) {
        $.ajax({
          method: "GET",
          url: `${REMP.apiUrl}/user/info`,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${REMP.tokenData.n_token}`
          }
        })
          .done(response => {
            // If valid, check for subscriptions.
            if (response.status === "ok") {
              $.ajax({
                method: "POST",
                url: `${REMP.apiUrl}/users/subscriptions`,
                headers: {
                  "Content-Type": "application/x-www-form-urlencoded",
                  Authorization: `Bearer ${REMP.tokenData.n_token}`
                }
              })
                .done(subscriptionResponse => {
                  let activeSub = false;
                  for (
                    let i = 0;
                    i < subscriptionResponse.subscriptions.length;
                    i++
                  ) {
                    const sub = subscriptionResponse.subscriptions[i];

                    // Check for active subscription with access to "web"
                    if (
                      new Date() > new Date(sub.start_at) &&
                      sub.access.indexOf("web") > -1
                    ) {
                      activeSub = true;
                    }
                  }

                  if (activeSub) {
                    successCallback();
                  } else {
                    failCallback(true);
                  }
                })
                .fail((jqXHR, textStatus) => {
                  if (textStatus === "timeout") {
                    console.error("server timeout");
                  } else {
                    console.error("server error");
                  }
                  failCallback();
                });
            } else {
              failCallback();
            }
          })
          .fail((jqXHR, textStatus) => {
            if (textStatus === "timeout") {
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
    getTokenData() {
      this.tokenData = {
        n_email: $.cookie("n_email"),
        n_token: $.cookie("n_token")
      };
    },

    // Displays restricted content.
    showContent() {
      if (this.memberContent.length) {
        if (this.settings.custom) {
          this.memberContent.show();
        } else {
          const rempId = this.memberContent.attr("data-remp-id").split(":");
          const endpoint = `${drupalSettings.path.baseUrl}remp_content/${
            rempId[0]
          }/${rempId[1]}`;
          Drupal.ajax({ url: endpoint }).execute();
        }
      }
    },

    // Hides restricted content.
    hideContent() {
      this.memberContent.hide();
    },

    // Shows login options for anonymous users or logged in users with no
    // subscription.
    showLogin(loggedIn) {
      const REMP = this;
      const { funnel } = drupalSettings.remp;

      if (REMP.memberContent.length) {
        if (loggedIn) {
          REMP.anonymContent.append(
            $("<h3>").text(
              Drupal.t("You don't have active subscription for this content.")
            )
          );
          REMP.anonymContent.append(
            $("<a/>", {
              href: `${
                drupalSettings.remp.host
              }/sales-funnel/sales-funnel-frontend/free?funnel=${funnel}&destination=${
                window.location.href
              }`
            }).text(Drupal.t("Apply for subscription to view full content"))
          );
        } else {
          REMP.buildForm();
          REMP.anonymContent.append($("<h3>").text(Drupal.t("Not a member?")));
          REMP.anonymContent.append(
            $("<a/>", {
              href: `${
                drupalSettings.remp.host
              }/sales-funnel/sales-funnel-frontend/free?funnel=${funnel}&destination=${
                window.location.href
              }`
            }).text(Drupal.t("Register Here"))
          );
        }
      }
    },

    // Builds Login form
    buildForm() {
      const REMP = this;
      const $form = $("<form/>", { id: "remp-login-form" });
      const $email = $("<input/>", {
        type: "text",
        id: "remp-email",
        name: "remp-email"
      });
      const $pass = $("<input/>", {
        type: "password",
        id: "remp-pass",
        name: "remp-pass"
      });
      const $submit = $("<input/>", {
        type: "submit",
        value: Drupal.t("Log in")
      }).addClass("button js-form-submit form-submit");
      const $errorContainer = $("<div/>");

      $form
        .append(
          $("<h3>").text(
            Drupal.t("You don't have permission to access this content")
          )
        )
        .append($errorContainer)
        .append(
          $("<div/>")
            .addClass("form-item")
            .append(
              $("<label>", { for: $email.attr("id") }).text(
                `${Drupal.t("Email")}:`
              )
            )
            .append($email)
        )
        .append(
          $("<div/>")
            .addClass("form-item")
            .append(
              $("<label>", { for: $pass.attr("id") }).text(
                `${Drupal.t("Password")}:`
              )
            )
            .append($pass)
        )
        .append($submit);

      // Handling form submission.
      $form.submit(e => {
        e.preventDefault();

        $.ajax({
          method: "POST",
          url: `${REMP.apiUrl}/users/login`,
          headers: {
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            Accept: "application/json"
          },
          data: {
            email: $email.val(),
            password: $pass.val()
          }
        })
          .done(response => {
            // Set valid cookies and reload the page after login.
            if (response.status === "ok") {
              $.cookie("n_token", response.access.token, {
                domain: `.${window.location.hostname}`,
                path: "/"
              });
              $.cookie("n_email", response.user.email, {
                domain: `.${window.location.hostname}`,
                path: "/"
              });
              window.location.reload();
            }
          })
          .fail((jqXHR, textStatus) => {
            if (textStatus === "timeout") {
              console.error("server timeout");
            } else if (
              jqXHR.responseJSON.error === "auth_failed" ||
              jqXHR.responseJSON.error === "no_email" ||
              jqXHR.responseJSON.error === "no_password"
            ) {
              $errorContainer.html("");
              $errorContainer.append(
                $("<div/>")
                  .addClass("messages__wrapper")
                  .append(
                    $("<div/>")
                      .addClass("messages messages--error")
                      .text(jqXHR.responseJSON.message)
                  )
              );
            } else {
              console.error(jqXHR.responseJSON.error);
            }
          });
      });

      REMP.anonymContent.append($form);
    }
  };

  // Initialize Remp and hide content.
  Drupal.behaviors.Remp.init();
})(jQuery, Drupal, drupalSettings);
