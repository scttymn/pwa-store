module ApplicationHelper
  def page_title(title)
    content_for(:title, title)
  end

  def store_nav_items
    [
      { name: "Home", path: root_path, key: :home },
      { name: "Explore", path: explore_path, key: :explore },
      { name: "Library", path: library_path, key: :library }
    ]
  end

  def nav_active?(key)
    current_nav == key
  end

  def current_nav
    return :explore if controller_name.in?(%w[explores searches])
    return :library if controller_name == "libraries"
    :home
  end

  def category_chips
    [ "all" ] + Listing::CATEGORIES.reject { |category| category == "other" }
  end

  def category_label(category)
    category.to_s == "all" ? "All" : category.to_s.titleize
  end

  def curated_for_you
    Listing.listings_for(%w[excalidraw proxx squoosh]).presence || Listing.all.first(3)
  rescue Listing::CatalogError
    []
  end

  def highlight_query(text, query)
    source = text.to_s
    return h(source) if query.blank?

    escaped = Regexp.escape(query.to_s.strip)
    return h(source) if escaped.empty?

    h(source).gsub(/#{escaped}/i) { |match| "<strong>#{h(match)}</strong>" }.html_safe
  end

  def install_caption(listing, form = :mobile)
    return "Adds #{listing.name} to your dock." if form == :desktop

    "Adds #{listing.name} to your Home Screen."
  end
end
