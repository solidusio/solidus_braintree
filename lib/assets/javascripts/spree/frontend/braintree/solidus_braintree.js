//= require "vendor/braintree-2.14.0"

Spree.routes.payment_client_token_api = Spree.pathFor("api/payment_client_token")

var braintreeDropinIntegration;
var cardSelector = "#payment-method-fields";
var paymentId;

var getClientToken = function(onSuccess) {
  hideFields();
  return Spree.ajax({
    url: Spree.routes.payment_client_token_api,
    type: "POST",
    data: {
      payment_method_id: paymentId
    },
    error: function(xhr, status) {
      // show_flash("error", xhr.responseJSON.message);
      showFields();
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

var attachDropIn = function(data) {
  // removeFields();
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

var hideFields = function() {
  $("#payment_method_" + paymentId).find(".field").hide();
  $("#credit-card-image").hide();
}

var showFields = function() {
  $("#payment_method_" + paymentId).find(".field").show();
  $("#credit-card-image").show();
}

var removeFields = function() {
  $("#payment_method_" + paymentId).find(".field").remove();
  $("#credit-card-image").remove();
}

$(document).ready(function() {
  if ($(cardSelector).find("input[type=radio][name='order[payments_attributes][][payment_method_id]']").length) {
    $(cardSelector).find("input[type=radio][name='order[payments_attributes][][payment_method_id]']").on("change", function() {
      paymentId = $(this).val();
      if (true || $(cardSelector + ":checked").val() === "new") {
        getClientToken(attachDropIn);
      } else {
        if (braintreeDropinIntegration) {
          braintreeDropinIntegration.teardown();
        }
      }
    });
  }
  paymentId = $("form input[type=radio][name='order[payments_attributes][][payment_method_id]']:checked").val();
  getClientToken(attachDropIn);
});
