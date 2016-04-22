module SolidusBraintree
  module PermittedAttributesConcern
    def payment_attributes
      super | [:payment_method_nonce, :device_data]
    end

    def source_attributes
      super | [:device_data]
    end

    def checkout_attributes
      super | [:device_data]
    end
  end
end
