module PaymentBraintreeNonceConcern
  extend ActiveSupport::Concern
  included do
    attr_accessor :payment_method_nonce

    prepend(InstanceMethods)
  end

  module InstanceMethods
    def create_payment_profile
      return unless source.respond_to?(:has_payment_profile?) && !source.has_payment_profile?

      payment_method.create_profile_from_nonce(self.order.user, self.order.bill_address, self.payment_method_nonce)
    rescue ActiveMerchant::ConnectionError => e
      gateway_error e
    end
  end
end
