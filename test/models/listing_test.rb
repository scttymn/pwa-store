require "test_helper"

class ListingTest < ActiveSupport::TestCase
  setup { Listing.reset! }

  test "catalog loads 6 to 8 curated listings" do
    assert_includes 6..8, Listing.all.size
  end

  test "every seeded listing matches the documented schema" do
    Listing.all.each do |listing|
      assert_predicate listing, :valid?, -> { listing.errors.full_messages.join(", ") }
      assert_includes Listing::CATEGORIES, listing.category
      assert_match %r{\Ahttps://}, listing.origin_url
      assert listing.screenshots.all? { |shot| shot["src"].present? && shot["alt"].present? }
      %w[beforeInstallPrompt iosA2HS desktop notes].each do |key|
        assert listing.installability.key?(key), "#{listing.slug} missing installability.#{key}"
      end
    end
  end

  test "slugs are unique" do
    slugs = Listing.all.map(&:slug)
    assert_equal slugs, slugs.uniq
  end

  test "find returns a listing by slug and find! raises when missing" do
    sample = Listing.all.first
    assert_equal sample.name, Listing.find(sample.slug).name
    assert_nil Listing.find("not-a-real-app")
    assert_raises(ActiveRecord::RecordNotFound) { Listing.find!("not-a-real-app") }
  end

  test "rejects an unknown category" do
    listing = Listing.from_hash(valid_payload.merge("category" => "lifestyle"))
    assert_not listing.valid?
    assert_includes listing.errors[:category], "is not included in the list"
  end

  test "rejects a non-https origin" do
    listing = Listing.from_hash(valid_payload.merge("originUrl" => "http://example.com/"))
    assert_not listing.valid?
  end

  test "exposes camelCase aliases from the YAML schema" do
    listing = Listing.all.first
    assert_equal listing.short_copy, listing.shortCopy
    assert_equal listing.origin_url, listing.originUrl
  end

  test "search is a curated substring match" do
    hits = Listing.search("draw")
    assert hits.any? { |listing| listing.slug == "excalidraw" }
    assert_empty Listing.search("figma")
    assert_empty Listing.search(" ")
  end

  test "featured listing and offline collection exist" do
    assert_equal "excalidraw", Listing.featured.slug
    assert Listing.featured.works_offline?
    assert Listing.collections.any? { |collection| collection.id == "offline" }
  end

  private

  def valid_payload
    {
      "slug" => "example-app",
      "name" => "Example",
      "icon" => "https://example.com/icon.png",
      "screenshots" => [ { "src" => "https://example.com/shot.png", "alt" => "Example screen" } ],
      "shortCopy" => "Short.",
      "longCopy" => "Longer copy.",
      "category" => "other",
      "originUrl" => "https://example.com/",
      "publisher" => "Example Inc",
      "installability" => {
        "beforeInstallPrompt" => true,
        "iosA2HS" => true,
        "desktop" => true,
        "notes" => "Test fixture."
      }
    }
  end
end
