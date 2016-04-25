module SolidusBraintree
  module InjectDeviceDataConcern
    extend ActiveSupport::Concern
    included do
      prepend(InstanceMethods)
    end

    module InstanceMethods
      def apply
        if attributes["device_data"].present?
          payments_attributes.each do |pa|
            pa["device_data"] = attributes["device_data"]
          end
        end

        super
      end
    end
  end
end
