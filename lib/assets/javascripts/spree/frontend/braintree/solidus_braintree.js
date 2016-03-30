//= require "vendor/braintree-2.14.0"

Spree.routes.payment_client_token_api = Spree.pathFor("api/payment_client_token")

var braintreeDropinIntegration;
var cardSelector = "#new_payment [name=card]";

var getClientToken = function(onSuccess) {
  return Spree.ajax({
    url: Spree.routes.payment_client_token_api,
    type: "POST",
    data: {
      payment_method_id: $('form input[type=radio]:checked').val()
    },
    error: function(xhr, status) {
      // show_flash("error", xhr.responseJSON.message);
      console.log(xhr.responseJSON.message)
    },
    success: function(data) {
      onSuccess(data);
    }
  });
};

var attachDropIn = function(data) {
  var paymentId = $('form input[type=radio]:checked').val();
  $("#payment_method_" + paymentId).find(".field").remove(); // Clear out old fields
  braintree.setup(data.client_token, "dropin", {
    container: "braintree-dropin",
    form: "checkout_form_payment",
    onReady: function (integration) {
      braintreeDropinIntegration = integration;
    },
    onError: function(type, message) {
      // show_flash("error", message);
      console.log(message);
    },
    onPaymentMethodReceived: function(obj) {
      $("#payment_method_nonce").val(obj.nonce);
      $("#checkout_form_payment").submit();
      return;
    }
  });
};

$(document).ready(function() {
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
});
