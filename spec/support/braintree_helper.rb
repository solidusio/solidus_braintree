module SolidusGateway
  module Helpers
    module BraintreeGateway
      def create_braintree_payment_method
        gateway = Solidus::Gateway::BraintreeGateway.create!(
          name: 'Braintree Gateway',
          active: true
        )
        gateway.set_preference(:environment, 'sandbox')
        gateway.set_preference(:merchant_id, 'zbn5yzq9t7wmwx42')
        gateway.set_preference(:public_key,  'ym9djwqpkxbv3xzt')
        gateway.set_preference(:private_key, '4ghghkyp2yy6yqc8')
        gateway.save!
        gateway
      end
    end
  end
end

RSpec.configure do |config|
  config.include SolidusGateway::Helpers::BraintreeGateway
end
