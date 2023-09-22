//= require "vendor/braintree"

Spree.pathFor.payment_client_token_api = Spree.pathFor("api/payment_client_token")

var braintreeDropinIntegration;
var paymentForm = "#new_payment";
var cardSelector = "#new_payment [name=card]";

var getClientToken = function(onSuccess) {
  return Spree.ajax({
    url: Spree.pathFor.payment_client_token_api,
    type: "POST",
    data: {
      payment_method_id: $('form input[type=radio]:checked').val()
    },
    error: function(xhr, status) {
      show_flash("error", xhr.responseJSON.message);
    },
    success: function(data) {
      onSuccess(data);
    }
  });
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
