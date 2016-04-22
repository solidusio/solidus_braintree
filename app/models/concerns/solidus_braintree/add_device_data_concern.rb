module SolidusBraintree
  module AddDeviceDataConcern
    extend ActiveSupport::Concern
    included do
      attr_accessor :device_data
    end
  end
end
