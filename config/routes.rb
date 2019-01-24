Spree::Core::Engine.routes.draw do
  namespace :api, defaults: { format: 'json' } do
    resource  :payment_client_token, only: [:create], controller: 'braintree_client_token'
  end

  namespace :admin do
    resource :payment_client_token, only: [:create], controller: 'braintree_client_token'
  end

  resource :payment_client_token, only: [:create], controller: 'braintree_client_token'
end
