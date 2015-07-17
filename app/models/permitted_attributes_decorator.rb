module PermittedAttributesDecorator
  def payment_attributes
    super << :payment_method_nonce
  end
end

Spree::PermittedAttributes.singleton_class.prepend PermittedAttributesDecorator
