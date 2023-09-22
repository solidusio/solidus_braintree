# frozen_string_literal: true

module PermittedAttributesDecorator
  def self.prepended(base)
    base.singleton_class.prepend SolidusBraintree::PermittedAttributesConcern
  end

  Spree::PermittedAttributes.singleton_class.prepend(self)
end
