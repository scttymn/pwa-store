class SearchesController < ApplicationController
  def show
    return render_catalog_error if params[:force] == "catalog"

    @query = params[:q].to_s.strip
    @results = Listing.search(@query)
    @collections = matching_collections
  rescue Listing::CatalogError
    render_catalog_error
  end

  private

  def matching_collections
    return [] if @query.blank?

    Listing.collections.select do |collection|
      haystack = [ collection.title, *Listing.listings_for(collection.slugs).map(&:name) ].join(" ").downcase
      haystack.include?(@query.downcase)
    end
  end

  def render_catalog_error
    @error_kind = :catalog
    render "errors/catalog", status: :service_unavailable
  end
end
