# Frozen catalog entry loaded from config/listings.yml.
# Not persisted. v1 is curated — there is no submission API or admin.
class Listing
  include ActiveModel::Model
  include ActiveModel::Attributes
  include ActiveModel::Validations

  CATEGORIES = %w[productivity media games social utilities other].freeze
  CATALOG_PATH = Rails.root.join("config/listings.yml")
  FEATURED_SLUG = "excalidraw"
  FEATURED_HEADLINE = "Drawings that survive airplane mode"
  SEARCH_SUGGESTIONS = %w[ink maps mail draw image music].freeze

  class CatalogError < StandardError; end

  Collection = Struct.new(:id, :title, :slugs, keyword_init: true)

  attribute :slug, :string
  attribute :name, :string
  attribute :icon, :string
  attribute :screenshots, default: -> { [] }
  attribute :short_copy, :string
  attribute :long_copy, :string
  attribute :category, :string
  attribute :origin_url, :string
  attribute :publisher, :string
  attribute :installability, default: -> { {} }

  alias_method :shortCopy, :short_copy
  alias_method :longCopy, :long_copy
  alias_method :originUrl, :origin_url

  validates :slug, :name, :icon, :short_copy, :long_copy, :category, :origin_url, :publisher, presence: true
  validates :category, inclusion: { in: CATEGORIES }
  validates :slug, format: { with: /\A[a-z0-9]+(?:-[a-z0-9]+)*\z/ }
  validate :origin_url_must_be_https
  validate :screenshots_must_be_shaped
  validate :installability_must_be_shaped

  class << self
    def all
      @all ||= load_catalog
    end

    def reset!
      @all = nil
    end

    def find(slug)
      all.find { |listing| listing.slug == slug }
    end

    def find!(slug)
      find(slug) || raise(ActiveRecord::RecordNotFound, "No listing #{slug}")
    end

    def featured
      find(FEATURED_SLUG) || all.first
    end

    def featured_headline
      FEATURED_HEADLINE
    end

    def in_category(category)
      return all if category.blank? || category == "all"
      all.select { |listing| listing.category == category }
    end

    def grouped_by_category
      CATEGORIES.each_with_object({}) do |category, groups|
        items = in_category(category)
        groups[category] = items if items.any?
      end
    end

    def search(query)
      needle = query.to_s.strip.downcase
      return [] if needle.empty?

      all.select do |listing|
        listing.search_blob.include?(needle)
      end
    end

    def collections
      [
        Collection.new(id: "offline", title: "Apps that work offline", slugs: all.select(&:works_offline?).map(&:slug))
      ].select { |collection| collection.slugs.any? }
    end

    def listings_for(slugs)
      slugs.filter_map { |slug| find(slug) }
    end

    def from_hash(raw)
      new(
        slug: raw.fetch("slug"),
        name: raw.fetch("name"),
        icon: raw.fetch("icon"),
        screenshots: Array(raw["screenshots"]),
        short_copy: raw.fetch("shortCopy"),
        long_copy: raw.fetch("longCopy"),
        category: raw.fetch("category"),
        origin_url: raw.fetch("originUrl"),
        publisher: raw.fetch("publisher"),
        installability: raw["installability"] || {}
      )
    end

    private

    def load_catalog
      raw = YAML.safe_load_file(CATALOG_PATH)
      Array(raw.fetch("listings")).map { |entry| from_hash(entry) }
    rescue Errno::ENOENT, Psych::SyntaxError, KeyError => error
      raise CatalogError, error.message
    end
  end

  def host
    URI.parse(origin_url).host
  rescue URI::InvalidURIError
    origin_url
  end

  def curated?
    true
  end

  def works_offline?
    "#{long_copy} #{installability["notes"]}".match?(/offline/i)
  end

  def category_label
    category.to_s.titleize
  end

  def search_blob
    [ name, short_copy, long_copy, category, category_label, publisher, host ].compact.join(" ").downcase
  end

  def to_h
    {
      "slug" => slug,
      "name" => name,
      "icon" => icon,
      "screenshots" => screenshots,
      "shortCopy" => short_copy,
      "longCopy" => long_copy,
      "category" => category,
      "originUrl" => origin_url,
      "publisher" => publisher,
      "installability" => installability
    }
  end

  private

  def origin_url_must_be_https
    uri = URI.parse(origin_url.to_s)
    errors.add(:origin_url, "must be https") unless uri.is_a?(URI::HTTPS)
  rescue URI::InvalidURIError
    errors.add(:origin_url, "is not a valid URL")
  end

  def screenshots_must_be_shaped
    unless screenshots.is_a?(Array) && screenshots.any?
      errors.add(:screenshots, "must contain at least one {src, alt} entry")
      return
    end

    screenshots.each do |shot|
      unless shot.is_a?(Hash) && shot["src"].present? && shot["alt"].present?
        errors.add(:screenshots, "entries must include src and alt")
        break
      end
    end
  end

  def installability_must_be_shaped
    unless installability.is_a?(Hash)
      errors.add(:installability, "must be a hash")
      return
    end

    %w[beforeInstallPrompt iosA2HS desktop notes].each do |key|
      errors.add(:installability, "missing #{key}") unless installability.key?(key)
    end
  end
end
