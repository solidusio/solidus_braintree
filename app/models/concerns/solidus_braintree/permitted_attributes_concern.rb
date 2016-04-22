module SolidusBraintree
  module PermittedAttributesConcern
    def payment_attributes
      super | [:payment_method_nonce]
    end

    def checkout_attributes
      super | [:device_data]
    end
  end
end
