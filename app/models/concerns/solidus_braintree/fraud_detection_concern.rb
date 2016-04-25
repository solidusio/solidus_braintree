module SolidusBraintree
  module FraudDetectionConcern
    extend ActiveSupport::Concern
    included do
      attr_accessor :device_data
      prepend(InstanceMethods)
    end

    module InstanceMethods
      def unprocessed_payments
        payments = super

        payments.each do |payment|
          payment.source.device_data = device_data
        end if device_data

        payments
      end
    end
  end
end
