class ExploresController < ApplicationController
  def show
    return render_catalog_error if params[:force] == "catalog"

    @category = params[:category].to_s.presence || "all"
    @featured = Listing.featured
    @groups = if @category == "all"
      Listing.grouped_by_category
    else
      Listing.grouped_by_category.slice(@category)
    end
    @collections = Listing.collections
  rescue Listing::CatalogError
    render_catalog_error
  end

  private

  def render_catalog_error
    @error_kind = :catalog
    render "errors/catalog", status: :service_unavailable
  end
end
