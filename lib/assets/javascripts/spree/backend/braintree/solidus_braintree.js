//= require "vendor/braintree-2.9.0"

Spree.routes.payment_client_token_api = Spree.pathFor("api/payment_client_token")

var getClientToken = function(onSuccess) {
  return Spree.ajax({
    url: Spree.routes.payment_client_token_api,
    type: "POST",
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
    onReady: function() {
      console.log("braintree dropin is ready");
      return;
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
  $("#new_payment [name=card][value=new]").click(function() {
    getClientToken(attachDropIn);
  });
});
