# frozen_string_literal: true

RSpec.shared_context 'with prepended view fixtures' do
  let(:view_fixtures_path) { 'spec/fixtures/views' }

  before do
    ApplicationController.prepend_view_path view_fixtures_path
  end

  after do
    view_paths = ApplicationController.view_paths.to_a

    view_paths.delete_if do |view_path|
      view_path.to_path.match?(/#{view_fixtures_path}$/)
    end

    ApplicationController.view_paths = view_paths
  end
end
