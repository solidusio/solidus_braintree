//= require "vendor/braintree-client"
//= require "vendor/braintree-data-collector"
//= require "vendor/braintree-hosted-fields"
//= require "vendor/braintree-paypal"
//= require "spree/jquery-promisify"

Spree.routes.payment_client_token_api = Spree.pathFor("api/payment_client_token");

window.SolidusBraintree = {};

// The options used to style our braintree hosted fields.
//
// Since this is the most likely place for customization, it has been extracted
// to a method which does it's best to read styles from the payment form.
// `.braintree-hosted-field` should be given the same look and feel as other
// payment form inputs so that we can avoid JS changes as much as possible.
//
// @returns {Object} An options hash for the HostedFields `styles`
SolidusBraintree.getFrontendStyles = function(){
  /* Emulation of inherited attributes through an iframe */
  var $source = $('.braintree-hosted-field');
  return {
    input: {
      "font-family": $source.css("font-family"),
      "font-size": $source.css("font-size"),
      "font-weight": $source.css("font-weight"),
      "letter-spacing": $source.css("letter-spacing"),
      "color": $source.css("color"),
    }
  };
};

// Extend default braintree hosted fields options.
//
// @param {Object} options - Additional options to override our defaults.
// @returns {Object} A merged options hash ready for a new HostedFields.
SolidusBraintree.hostedFieldsOptions = function(options) {
  return $.extend({
    styles: SolidusBraintree.getFrontendStyles(),
    fields: {
      number: {
        selector: "#braintree_card_number",
        placeholder: braintree.placeholders["number"]
      },
      cvv: {
        selector: "#braintree_card_code",
        placeholder: braintree.placeholders["cvv"]
      },
      expirationDate: {
        selector: "#braintree_card_expiry",
        placeholder: braintree.placeholders["expirationDate"]
      }
    }
  }, options);
};

// Fetch a gateway client token.
//
// @param {(string|number)} paymentId - A Spree::PaymentMethod id.
//
// @returns {jqXHR} A jQuery XHR object which will resolve to a client_token.
SolidusBraintree.getClientToken = function(paymentId) {
  return Spree.ajax({
    url: Spree.routes.payment_client_token_api,
    type: "POST",
    data: {
      payment_method_id: paymentId
    }
  }).then(function(data) {
    return data.client_token;
  });
};

// Alert users to braintree errors.
//
// @param {BraintreeError} error - An error from braintree js sdk v3.
// https://braintree.github.io/braintree-web/current/BraintreeError.html
SolidusBraintree.onClientError = function(error) {
  var text;

  if (error.type === "VALIDATION") {
    text = 'There was a problem with your payment information. Please check your information and try again.';
  } else {
    text = error.message;
  }

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
  return error;
};

// Inject payment token to hidden field and submit payment form to Solidus.
//
// @param {tokenizePayload} payload from a Paypal or HostedFields tokenize
SolidusBraintree.submitNonce = function(payload) {
  SolidusBraintree.setNonce(payload.nonce);
  SolidusBraintree.$.paymentForm.submit();
};

// Interupt payment form submission to inject a tokenized payment method.
//
// When the user clicks the paypal button we ask Braintree to take over. When
// the user is done with the Paypal flow we will be returned a payment nonce
// which we can inject into the form.
//
// @param {Event} e - jQuery event object from the initial form submission.
SolidusBraintree.onClickPaypal = function(e) {
  e.preventDefault();
  // Only one PayPal login flow should be active at a time.
  if (SolidusBraintree.tokenizeReturn) {
    SolidusBraintree.tokenizeReturn.close();
  }
  SolidusBraintree.tokenizeReturn = e.data.paypalInstance.tokenize({
    flow: 'vault'
  }, function(err, payload) {
    if (err) {
      return SolidusBraintree.onPaypalError(err);
    }
    SolidusBraintree.submitNonce(payload)
  })
};

// Handle Paypal errors.
//
// There is only one "expected" error, which we wish to ignore. Other errors,
// should notify the user as normal.
// @param {BraintreeError} error - An error from braintree js sdk v3.
SolidusBraintree.onPaypalError = function(err) {
  switch (err.code) {
    case 'PAYPAL_POPUP_CLOSED':
      // no need to notify the user they closed a popup
      break;
    case 'PAYPAL_ACCOUNT_TOKENIZATION_FAILED':
    case 'PAYPAL_FLOW_FAILED':
    default:
      SolidusBraintree.onClientError(err);
  }
};

// Interupt payment form submission to inject a tokenized payment method.
//
// Upon user submit we ask braintree to tokenize our hosted fields. We then
// inject the token into the form and resubmit the form to Solidus. The same
// short-circuit which submits the hosted fields nonce to the server also
// allows both paypal and CC to co-exist.
//
// @param {Event} e - jQuery event object from the initial form submission.
SolidusBraintree.onSubmitPayment = function(e) {
  var nonce = $("#payment_method_nonce").val();
  if(!nonce) {
    e.preventDefault();
    promisify(e.data.hostedFieldsInstance.tokenize, [{
      flow: 'vault'
    }], e.data.hostedFieldsInstance)
      .then(SolidusBraintree.submitNonce, SolidusBraintree.onClientError);
  }
};

// Disable the payment form.
//
// The payment form is disabled while initializing braintree js.
SolidusBraintree.disablePayment = function () {
  SolidusBraintree.$.paymentForm.find(':submit, :image').prop('disabled', true).addClass('disabled');
};

// Re-enbale the payment form.
SolidusBraintree.enablePayment = function () {
  SolidusBraintree.$.paymentForm.find(':submit, :image').prop('disabled', false).removeClass('disabled');
};

// Attach click handler to paypal button.
//
// We pass the Paypal instance to the submit handler as data, so that
// it can tokenize the user's input and send a safe payload to Solidus.
SolidusBraintree.bindPaypalButton = function (paypalInstance) {
  SolidusBraintree.$.paypalButton
    .off('click', SolidusBraintree.onClickPaypal)
    .on('click', {
      paypalInstance: paypalInstance
    }, SolidusBraintree.onClickPaypal);
  return paypalInstance;
};

// Attach submit handler for hosted fields.
//
// We pass the HostedFields instance to the submit handler as data, so that
// it can tokenize the user's input and send a safe payload to Solidus.
SolidusBraintree.bindHostedFields = function (hostedFieldsInstance) {
  SolidusBraintree.$.paymentForm
    .off('submit', SolidusBraintree.onSubmitPayment)
    .on('submit', {
      hostedFieldsInstance: hostedFieldsInstance
    }, SolidusBraintree.onSubmitPayment);
  return hostedFieldsInstance;
};

// Inject the DataCollector deviceData in our form.
//
// deviceData is a JSON string which is used to correlate user sessions with
// braintree transactions.
//
// @param {DataCollector} dataCollectorInstance - Our configured data collector.
SolidusBraintree.setDeviceData = function(dataCollectorInstance) {
  $("input#device_data").val(dataCollectorInstance.deviceData);
};

// Create braintree data collector.
//
// This is used for advanced fraud integration with PayPal and Kount.
//
// @param {Client} clientInstance - A braintree client instance.
// @returns {Promise} A dataCollectorInstance wrapped in a jQuery promise object.
SolidusBraintree.createDataCollector = function(clientInstance) {
  return promisify(braintree.dataCollector.create, [{
    client: clientInstance,
    kount: true
  }]).then(function(dc) { return SolidusBraintree.dataCollectorInstance = dc; });
};

// Create braintree paypal component.
//
// @param {Client} clientInstance - A braintree client instance.
// @returns {Promise} A paypalInstance wrapped in a jQuery promise object.
SolidusBraintree.createPaypal = function(clientInstance) {
  return promisify(braintree.paypal.create, [{client: clientInstance}])
    .then(function(pi) { return SolidusBraintree.paypalInstance = pi; });
};

// Create braintree hosted fields.
//
// There is in implied argument which is the `hostedFieldsOptions`. For the sake
// of customizability these have been abstracted to another method. Those
// options are fetched here and passed to braintree to init our hosted fields.
//
// @param {Client} clientInstance - A braintree client instance.
// @returns {Promise} A hostedFieldsInstance wrapped in a jQuery promise object.
SolidusBraintree.createHostedFields = function(clientInstance) {
  return promisify(braintree.hostedFields.create, [
    SolidusBraintree.hostedFieldsOptions({client: clientInstance})
  ])
    .then(function(hf) { return SolidusBraintree.hostedFieldsInstance = hf; });
};

// Create braintree client object.
//
// This serves as the base API layer that communicates with braintree.
//
// @param {String} clientToken - A client token generated by the Braintree server
// SDK which contains all authorization and configuration information needed to
// initialize the client SDK to communicate with Braintree.
// @returns {Promise} A clientInstance wrapped in a jQuery promise object.
SolidusBraintree.createClient = function(clientToken) {
  return promisify(braintree.client.create, [{authorization: clientToken}])
    .then(function(ci) { return SolidusBraintree.clientInstance = ci; });
};

// The currently selected payment method id.
//
// @returns {Promise} The currently selected payment method id wrapped in a
// jQuery promise object (so we can consistently chain with async actions).
SolidusBraintree.getPaymentId = function() {
  var paymentId = SolidusBraintree.$.paymentMethodInputs.filter(":checked").val();
  return $.when(paymentId);
};

// Set payment nonce
SolidusBraintree.setNonce = function(nonce) {
  SolidusBraintree.$.paymentNonceInput.val(nonce);
};

SolidusBraintree.teardown = function() {
  SolidusBraintree.hostedFieldsInstance = SolidusBraintree.hostedFieldsInstance
    && SolidusBraintree.hostedFieldsInstance.teardown();
  SolidusBraintree.paypalInstance = SolidusBraintree.paypalInstance
    && SolidusBraintree.paypalInstance.teardown();
  SolidusBraintree.dataCollectorInstance = SolidusBraintree.dataCollectorInstance
    && SolidusBraintree.dataCollectorInstance.teardown();
};

// Attempt to fetch a Braintree client token and initialize if it works
SolidusBraintree.initPaymentMethod = function() {
  SolidusBraintree.getPaymentId()
    .then(SolidusBraintree.getClientToken)
    .then(SolidusBraintree.initBraintree);
};

// Initialize braintree and bind to the payment form.
//
// This is the list of instructions for creating the braintree hosted fields
// and handling user submission of their payment information.
// @param {string} a Braintree tokenizationKey provided by the server side sdk
SolidusBraintree.initBraintree = function(clientToken) {
  var createPaypal,
      createHostedFields,
      createDataCollector;
  var createClient = SolidusBraintree.clientInstance ?
    $.when(SolidusBraintree.clientInstance)
  : SolidusBraintree.createClient(clientToken);

  SolidusBraintree.teardown();
  SolidusBraintree.disablePayment();

  if (SolidusBraintree.$.paypalContainer.length) {
    createPaypal = createClient
      .then(SolidusBraintree.createPaypal)
      .then(SolidusBraintree.bindPaypalButton);
  }

  if (SolidusBraintree.$.ccContainer.length) {
    createHostedFields = createClient
      .then(SolidusBraintree.createHostedFields)
      .then(SolidusBraintree.bindHostedFields);
  }

  if (braintree.dataCollector) {
    createDataCollector = createClient
      .then(SolidusBraintree.createDataCollector)
      .then(SolidusBraintree.setDeviceData);
  }

  $.when(createPaypal, createHostedFields, createDataCollector)
    .fail(SolidusBraintree.onClientError)
    .always(SolidusBraintree.enablePayment);
};

// Initialize braintree on page load and whenever the payment method changes.
$(document).ready(function() {
  SolidusBraintree.$ = {
    paymentForm: $('#checkout_form_payment'),
    paymentMethodInputs: $('[name*="[payment_method_id]"]'),
    paypalContainer: $('.braintree-paypal-input'),
    ccContainer: $('.braintree-cc-input'),
    paypalButton: $('#braintree-paypal-button'),
    paymentNonceInput: $('#payment_method_nonce')
  };

  if (SolidusBraintree.$.paymentMethodInputs.length) {
    SolidusBraintree.initPaymentMethod();
    SolidusBraintree.$.paymentMethodInputs.on("change", SolidusBraintree.initPaymentMethod);
  }
});
