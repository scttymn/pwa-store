class LibrariesController < ApplicationController
  def show
    return render_catalog_error if params[:force] == "catalog"

    @listings = Listing.all
    @next_up = Listing.all.reject { |listing| listing.slug == Listing::FEATURED_SLUG }.first(4)
  rescue Listing::CatalogError
    render_catalog_error
  end

  private

  def render_catalog_error
    @error_kind = :catalog
    render "errors/catalog", status: :service_unavailable
  end
end
