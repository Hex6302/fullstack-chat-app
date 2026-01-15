import { useState, useRef } from "react";
import { X, Search, Image, Link, Calendar, FileText, Filter } from "lucide-react";
import { useChatStore } from "../store/useChatStore";
import { useGroupStore } from "../store/useGroupStore";
import { formatDistanceToNow } from "date-fns";

const MessageSearchModal = ({ isOpen, onClose, chatId, chatType = "direct" }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    hasImages: false,
    hasLinks: false,
    dateRange: null,
    senderId: null,
  });
  const [showFilters, setShowFilters] = useState(false);
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const { messages } = useChatStore();
  const { groupMessages } = useGroupStore();

  const handleSearch = async () => {
    if (!searchTerm.trim() && !Object.values(filters).some(v => v)) {
      return;
    }

    setIsSearching(true);
    
    try {
      let searchResults = [];
      const messagesToSearch = chatType === "direct" ? messages : groupMessages;

      searchResults = messagesToSearch.filter((message) => {
        let matches = true;

        // Search term filter
        if (searchTerm.trim()) {
          const searchLower = searchTerm.toLowerCase();
          const textMatch = message.text?.toLowerCase().includes(searchLower);
          matches = matches && (textMatch || false);
        }

        // Image filter
        if (filters.hasImages) {
          matches = matches && !!message.image;
        }

        // Link filter (basic detection)
        if (filters.hasLinks) {
          const hasLink = message.text?.match(/https?:\/\/[^\s]+/);
          matches = matches && hasLink;
        }

        // Date range filter
        if (filters.dateRange?.start && filters.dateRange?.end) {
          const messageDate = new Date(message.createdAt);
          matches = matches && messageDate >= filters.dateRange.start && messageDate <= filters.dateRange.end;
        }

        return matches;
      });

      setResults(searchResults);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const clearFilters = () => {
    setFilters({
      hasImages: false,
      hasLinks: false,
      dateRange: null,
      senderId: null,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-base-100 rounded-lg shadow-xl w-full max-w-3xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-base-300">
          <div className="flex items-center gap-2">
            <Search className="size-5" />
            <h3 className="text-lg font-semibold">Search Messages</h3>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-sm btn-circle">
            <X className="size-4" />
          </button>
        </div>

        {/* Search Input */}
        <div className="p-4 border-b border-base-300 space-y-3">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 size-4 text-base-content/50" />
              <input
                type="text"
                placeholder="Search messages..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={handleKeyPress}
                className="input input-bordered w-full pl-10"
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={isSearching}
              className="btn btn-primary"
            >
              <Search className="size-4" />
              Search
            </button>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`btn ${showFilters ? "btn-primary" : "btn-outline"}`}
            >
              <Filter className="size-4" />
              Filters
            </button>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="bg-base-200 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Search Filters</h4>
                <button onClick={clearFilters} className="btn btn-ghost btn-xs">
                  Clear All
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-base-300">
                  <Image className="size-4" />
                  <input
                    type="checkbox"
                    checked={filters.hasImages}
                    onChange={(e) => setFilters({ ...filters, hasImages: e.target.checked })}
                    className="checkbox checkbox-sm"
                  />
                  <span className="text-sm">Has Images</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-base-300">
                  <Link className="size-4" />
                  <input
                    type="checkbox"
                    checked={filters.hasLinks}
                    onChange={(e) => setFilters({ ...filters, hasLinks: e.target.checked })}
                    className="checkbox checkbox-sm"
                  />
                  <span className="text-sm">Has Links</span>
                </label>
              </div>

              {/* Date Range */}
              <div className="flex gap-2">
                <label className="flex items-center gap-2 flex-1 cursor-pointer">
                  <Calendar className="size-4" />
                  <input
                    type="date"
                    onChange={(e) =>
                      setFilters({
                        ...filters,
                        dateRange: {
                          ...filters.dateRange,
                          start: e.target.value ? new Date(e.target.value) : null,
                        },
                      })
                    }
                    className="input input-bordered input-sm flex-1"
                  />
                </label>
                <span className="self-center">to</span>
                <label className="flex items-center gap-2 flex-1 cursor-pointer">
                  <Calendar className="size-4" />
                  <input
                    type="date"
                    onChange={(e) =>
                      setFilters({
                        ...filters,
                        dateRange: {
                          ...filters.dateRange,
                          end: e.target.value ? new Date(e.target.value) : null,
                        },
                      })
                    }
                    className="input input-bordered input-sm flex-1"
                  />
                </label>
              </div>
            </div>
          )}

          {/* Results Summary */}
          {results.length > 0 && (
            <div className="text-sm text-base-content/70 flex items-center gap-2">
              <FileText className="size-4" />
              Found {results.length} {results.length === 1 ? "message" : "messages"}
            </div>
          )}
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-4">
          {isSearching ? (
            <div className="flex justify-center py-8">
              <span className="loading loading-spinner loading-md"></span>
            </div>
          ) : results.length === 0 && searchTerm ? (
            <div className="text-center py-8 text-base-content/50">
              <Search className="size-12 mx-auto mb-4 opacity-50" />
              <p>No messages found</p>
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-8 text-base-content/50">
              <FileText className="size-12 mx-auto mb-4 opacity-50" />
              <p>Enter a search term or use filters to find messages</p>
            </div>
          ) : (
            <div className="space-y-2">
              {results.map((message, index) => (
                <div
                  key={`${message._id}-${index}`}
                  className="p-3 rounded-lg border border-base-300 hover:bg-base-200 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      {message.image ? (
                        <Image className="size-5 text-blue-500" />
                      ) : (
                        <FileText className="size-5 text-gray-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">
                          {message.senderId?.fullName || "You"}
                        </span>
                        <span className="text-xs text-base-content/50">
                          {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                      {message.text && (
                        <p className="text-sm text-base-content/80 whitespace-pre-wrap line-clamp-2">
                          {message.text}
                        </p>
                      )}
                      {message.image && (
                        <div className="mt-2 rounded-lg overflow-hidden max-w-xs">
                          <img
                            src={message.image}
                            alt="Message"
                            className="max-h-32 object-cover w-full"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageSearchModal;











