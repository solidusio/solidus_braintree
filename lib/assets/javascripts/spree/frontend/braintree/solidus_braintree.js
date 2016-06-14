//= require "vendor/braintree"

SolidusBraintree = {
  getFrontendStyles: function(){
    /* Emulation of inherited attributes through an iframe */
    var $source = $('.braintree-hosted-field');
    return {
      input: {
        "font-family": $source.css("font-family"),
        "font-size": $source.css("font-size"),
        "color": $source.css("color"),
      }
    };
  }
}

Spree.routes.payment_client_token_api = Spree.pathFor("api/payment_client_token")

var braintreeDropinIntegration;
var cardSelector = "#payment-method-fields";
var confirmForm = "#checkout_form_confirm";
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
    hostedFields: {
      styles: SolidusBraintree.getFrontendStyles(),
      number: {
        selector: "#braintree_card_number"
      },
      cvv: {
        selector: "#braintree_card_code"
      },
      expirationDate: {
        selector: "#braintree_card_expiry"
      }
    },
    dataCollector: {
      kount: {environment: braintree.environment},
      paypal: true
    },
    paypal: {
      container: "#braintree_paypal_container",
      onSuccess: function() {
        $(".braintree-cc-input").hide();
      },
      onCancelled: function() {
        $(".braintree-cc-input").show();
      }
    },
    onReady: function (integration) {
      braintreeDropinIntegration = integration;
      $('form').find("input#device_data").val(integration.deviceData);
    },
    onError: function(error) {
      var text;

      if (error.type === "VALIDATION") {
        text = 'There was a problem with your payment information. Please check your information and try again.';
      } else {
        text = error.message;
      }

      $('#checkout_form_payment').find(':submit, :image').attr('disabled', false).removeClass('disabled');
      var errorDiv = $("<div/>", {
        class: 'flash error',
        text: text
      });

      if (error.details) {
        var list = $("<ul/>").appendTo(errorDiv);
        $.each(error.details.invalidFieldKeys, function (idx) {
          $('<li/>', {
            text: error.details.invalidFieldKeys[idx] + " is required."
          }).appendTo(list);
        });
      }

      if ($('.flash.error').length == 0) {
        errorDiv.prependTo("#content");
      } else {
        $('.flash.error').replaceWith(errorDiv);
      }
    },
    onPaymentMethodReceived: function(obj) {
      $("#payment_method_nonce").val(obj.nonce);
      $("#checkout_form_payment").submit();
      return;
    }
  });
};

var getDeviceDataConfirm = function(data) {
  var collector = braintree.data.setup({
    kount: {environment: braintree.environment}
  });
  $('form').find("input#device_data").val(collector.deviceData);
  collector.teardown();
};

$(document).ready(function() {
  if ($(cardSelector).find("input[type=radio][name='order[payments_attributes][][payment_method_id]']").length) {
    $(cardSelector).find("input[type=radio][name='order[payments_attributes][][payment_method_id]']").on("change", function() {
      if ($(cardSelector + ":checked").val() === "new") {
        getClientToken(initializeBraintree);
      } else {
        if (braintreeDropinIntegration) {
          braintreeDropinIntegration.teardown();
        }
      }
    });
  }

  // Attempt to inject device_data to confirm form.
  if ($(confirmForm).length && braintree.environment) {
    getDeviceDataConfirm();
  }
});
