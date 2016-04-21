//= require "vendor/braintree"

Spree.routes.payment_client_token_api = Spree.pathFor("api/payment_client_token")

var braintreeDropinIntegration;
var cardSelector = "#payment-method-fields";
var paymentId;

var getClientToken = function(onSuccess) {
  return Spree.ajax({
    url: Spree.routes.payment_client_token_api,
    type: "POST",
    data: {
      payment_method_id: paymentId
    },
    error: function(xhr, status) {
      // If it fails it means the payment method was not a Braintree payment method
      if (braintreeDropinIntegration) {
        braintreeDropinIntegration.teardown();
        braintreeDropinIntegration = null;
      }
    },
    success: function(data) {
      onSuccess(data);
    }
  });
};

var initializeBraintree = function(data) {
  $("#card_expiry").on("keyup", function() {
    // We need to format the braintree expiration without spaces
    $("#braintree_expiration_date").val($(this).val().replace(/ /g,''));
  })
  braintree.setup(data.client_token, "custom", {
    id: "checkout_form_payment",
    dataCollector: {
      kount: {environment: 'sandbox'}
    },
    onReady: function (integration) {
      console.log(integration);
      braintreeDropinIntegration = integration;
      $('form').find("input#device_data").val(integration.deviceData);
    },
    onError: function(type, message) {
      console.log(type);
      show_flash("error", message);
    },
    onPaymentMethodReceived: function(obj) {
      $("#payment_method_nonce").val(obj.nonce);
      $("#checkout_form_payment").submit();
      return;
    }
  });
};

$(document).ready(function() {
  if ($(cardSelector).find("input[type=radio][name='order[payments_attributes][][payment_method_id]']").length) {
    $(cardSelector).find("input[type=radio][name='order[payments_attributes][][payment_method_id]']").on("change", function() {
      paymentId = $(this).val();
      getClientToken(initializeBraintree);
    });
    // Attempt to initialize braintree
    paymentId = $("form input[type=radio][name='order[payments_attributes][][payment_method_id]']:checked").val();
    getClientToken(initializeBraintree);
  }
});
