# frozen_string_literal: true

module CreditCardDecorator
  def self.prepended(base)
    base.include SolidusBraintree::SkipRequireCardNumbersConcern
    base.include SolidusBraintree::AddNameValidationConcern
    base.include SolidusBraintree::UseDataFieldConcern
  end

  Spree::CreditCard.prepend(self)
end
