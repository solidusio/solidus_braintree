module SolidusBraintree
  module AddNameValidationConcern
    extend ActiveSupport::Concern
    included do
      validates :name, presence: true, on: :create
    end
  end
end
