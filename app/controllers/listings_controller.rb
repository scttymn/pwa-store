class ListingsController < ApplicationController
  def index
    return render_catalog_error if force_catalog_error?

    load_catalog
    @category = params[:category].to_s.presence || "all"
    @featured = Listing.featured
    @groups = filtered_groups
  rescue Listing::CatalogError
    render_catalog_error
  end

  def show
    return render_catalog_error if force_catalog_error?

    @listing = Listing.find!(params[:slug])
    @origin_down = params[:origin_down] == "1"
  rescue Listing::CatalogError
    render_catalog_error
  end

  private

  def load_catalog
    Listing.all
  end

  def filtered_groups
    groups = Listing.grouped_by_category
    return groups if @category == "all"

    groups.slice(@category)
  end

  def force_catalog_error?
    params[:force] == "catalog"
  end

  def render_catalog_error
    @error_kind = :catalog
    render "errors/catalog", status: :service_unavailable
  end
end
