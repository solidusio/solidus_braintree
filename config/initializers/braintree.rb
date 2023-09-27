Rails.application.config.to_prepare do
  ActionView::Base.include(BraintreeViewHelpers)
end
