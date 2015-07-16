Spree::Core::Engine.add_routes do
  namespace :api, defaults: { format: 'json' } do
    resource  :payment_client_token, only: [:create], controller: 'braintree_client_token'
  end
end
