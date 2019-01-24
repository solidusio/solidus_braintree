//= require "vendor/braintree"

Spree.routes.payment_client_token_api = Spree.pathFor("api/payment_client_token")

var braintreeDropinIntegration;
var paymentForm = "#new_payment";
var cardSelector = "#new_payment [name=card]";
var braintreeClientTokenSelector = '#braintree_client_token';

var getClientToken = function(onSuccess) {
  var data = {
    client_token: $(braintreeClientTokenSelector).val()
  };

  onSuccess(data);
};

var attachDropIn = function(data) {
  braintree.setup(data.client_token, "dropin", {
    container: "braintree-dropin",
    form: "new_payment",
    onReady: function (integration) {
      braintreeDropinIntegration = integration;
    },
    onError: function(type, message) {
      show_flash("error", message);
    },
    onPaymentMethodReceived: function(obj) {
      $("#payment_method_nonce").val(obj.nonce);
      $("#new_payment").submit();
      return;
    }
  });
};

$(document).ready(function() {
  if ($(paymentForm).length) {
    if ($(cardSelector).length) {
      $(cardSelector).on("change", function() {
        if ($(cardSelector + ":checked").val() === "new") {
          getClientToken(attachDropIn);
        } else {
          if (braintreeDropinIntegration) {
            braintreeDropinIntegration.teardown();
          }
        }
      });
    } else {
      getClientToken(attachDropIn);
    }
  }
});
