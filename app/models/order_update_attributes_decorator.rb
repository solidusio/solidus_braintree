Spree::OrderUpdateAttributes.class_eval do

  module CardSecurity

    def apply
      if attributes["device_data"].present?
        payments_attributes.each do |pa|
          pa["device_data"] = attributes["device_data"]
        end
      end

      success = super

      success
    end
  end

  prepend CardSecurity

end
