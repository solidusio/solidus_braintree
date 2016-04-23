module SolidusBraintree
  module PermittedAttributesConcern
    def payment_attributes
      super | [:payment_method_nonce, :device_data]
    end
  end
end
