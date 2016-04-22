Spree::CreditCard.include SolidusBraintree::SkipRequireCardNumbersConcern
Spree::CreditCard.include SolidusBraintree::AddNameValidationConcern
Spree::CreditCard.include SolidusBraintree::UseDataFieldConcern

Spree::CreditCard.class_eval do
  attr_accessor :device_data
end

Spree::Order.class_eval do
  attr_accessor :device_data

  module CardSecurity
    def unprocessed_payments
      payments = super

      payments.each do |payment|
        payment.source.device_data = device_data
      end if device_data

      payments
    end
  end

  prepend CardSecurity
end
