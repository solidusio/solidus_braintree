module Spree
  class BraintreeClientTokenController < Spree::BaseController
    include SolidusBraintreeClientToken
    protect_from_forgery except: [:create]
  end
end
