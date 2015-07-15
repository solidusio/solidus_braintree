module SolidusBraintree
  class Engine < Rails::Engine
    engine_name 'solidus_braintree'

    config.autoload_paths += %W(#{config.root}/lib)

    initializer "spree.gateway.payment_methods", after: "spree.register.payment_methods" do |app|
      app.config.spree.payment_methods << Solidus::Gateway::BraintreeGateway
    end
  end
end
