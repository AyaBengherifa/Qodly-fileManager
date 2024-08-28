import { useRenderer, useSources } from '@ws-ui/webform-editor';
import cn from 'classnames';
import { FC, useState, useEffect } from 'react';
import { IFileManagerProps, IFileItem } from './FileManager.config';
import {
  IconFolder,
  IconFile,
  IconChevronRight,
  IconChevronDown,
  IconArrowNarrowLeft,
  IconInfoCircle,
  IconDownload,
  IconSortAscending,
  IconTrash,
} from '@tabler/icons-react';

const FileManagerItem: FC<{
  item: IFileItem;
  level: number;
  onFileClick: (item: IFileItem) => void;
  onFolderClick: (item: IFileItem) => void;
}> = ({ item, level, onFileClick, onFolderClick }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleArrowClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  const handleItemClick = () => {
    if (item.type === 'folder') {
      onFolderClick(item);
    } else {
      onFileClick(item);
    }
  };

  return (
    <div className={cn('file-item select-none', { 'ml-4': level > 0 })}>
      <div
        className="file-item-row flex items-center cursor-pointer hover:bg-gray-200 p-2 rounded"
        onClick={handleItemClick}
      >
        {item.type === 'folder' && (
          <span onClick={handleArrowClick}>
            {isOpen ? (
              <IconChevronDown className="mr-2 text-gray-500" />
            ) : (
              <IconChevronRight className="mr-2 text-gray-500" />
            )}
          </span>
        )}
        {item.type === 'folder' ? (
          <IconFolder className="mr-2 text-yellow-500" />
        ) : (
          <IconFile className="mr-2 text-gray-500" />
        )}
        <span className="text-sm font-medium text-gray-700">{item.name}</span>
      </div>
      {isOpen && item.children && (
        <div className="file-item-children ml-4">
          {item.children.map((child, index) => (
            <FileManagerItem
              key={index}
              item={child}
              level={level + 1}
              onFileClick={onFileClick}
              onFolderClick={onFolderClick}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const FileManager: FC<IFileManagerProps> = ({ style, className, classNames = [] }) => {
  const { connect, emit } = useRenderer();
  const [items, setItems] = useState<IFileItem[]>([]);
  const [currentItem, setCurrentItem] = useState<IFileItem | null>(null);
  const [path, setPath] = useState<IFileItem[]>([]);
  const [searchValue, setSearchValue] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const {
    sources: { datasource: ds },
  } = useSources();

  const handleFileClick = (item: IFileItem) => {
    console.log('File clicked:', item.name);
    setCurrentItem(item);
    emit('onfileclick');
  };

  const handleFolderClick = (item: IFileItem) => {
    if (item.type === 'folder') {
      setCurrentItem(item);
      setPath((prevPath) => [...prevPath, item]);
    }
  };

  const handleEmitClick = () => {
    emit('onfolderclick');
  };

  const handleBackClick = () => {
    setPath((prevPath) => {
      const newPath = [...prevPath];
      newPath.pop();
      const parentFolder = newPath[newPath.length - 1] || null;
      setCurrentItem(parentFolder);
      return newPath;
    });
  };

  useEffect(() => {
    const listener = async () => {
      if (ds) {
        const value = await ds.getValue();
        if (Array.isArray(value)) {
          setItems(value);
        }
      }
    };

    if (ds) {
      ds.addListener('changed', listener);
      listener();
    }

    return () => {
      if (ds) {
        ds.removeListener('changed', listener);
      }
    };
  }, [ds]);
  const filterItems = (items: IFileItem[], value: string): IFileItem[] => {
    return items
      .filter((item) => item.name.toLowerCase().includes(value.toLowerCase()))
      .map((item) => ({
        ...item,
        children: item.children ? filterItems(item.children, value) : [],
      }));
  };
  const sortItems = (items: IFileItem[], value: string): IFileItem[] => {
    return items.sort((a, b) => {
      if (value === 'name') {
        return a.name.localeCompare(b.name);
      } else if (value === 'size') {
        return (b.size || 0) - (a.size || 0);
      }
      return 0;
    });
  };

  const filteredContentItems =
    currentItem?.type === 'folder'
      ? sortItems(filterItems(currentItem.children || [], searchValue), sortBy)
      : [];
  const renderNavigationPane = () => (
    <div className="navigation-pane w-1/4 border-r border-gray-300 bg-gray-50 p-4">
      <h3 className="font-semibold text-gray-600 text-lg mb-4">Navigation</h3>
      <div className="mt-2 space-y-2">
        {items.map((item, index) => (
          <FileManagerItem
            key={index}
            item={item}
            level={0}
            onFileClick={handleFileClick}
            onFolderClick={handleFolderClick}
          />
        ))}
      </div>
    </div>
  );

  const renderContentView = () => (
    <div className="content-pane w-3/4 p-4">
      <h3 className="font-semibold text-gray-600 text-lg mb-4">Content</h3>
      <div className="mb-4">
        {path.length > 0 && (
          <button className="text-blue-500 hover:text-blue-700 underline" onClick={handleBackClick}>
            <IconArrowNarrowLeft />
          </button>
        )}
      </div>
      {filteredContentItems.length > 0 ? (
        <div className="mt-2 space-y-2">
          {filteredContentItems.map((item, index) => (
            <div
              key={index}
              className="file-item-row flex items-center p-2 hover:bg-gray-200 rounded cursor-pointer"
              onClick={() => handleFolderClick(item)}
              onContextMenu={(e) => {
                e.preventDefault();
                handleEmitClick();
              }}
            >
              {item.type === 'folder' ? (
                <IconFolder stroke={1.5} className="mr-2 text-yellow-500" />
              ) : (
                <IconFile stroke={1.5} className="mr-2 text-gray-500" />
              )}
              <div className="flex-1">
                <div className="font-medium text-gray-700">{item.name}</div>
                <div className="text-sm text-gray-500">
                  {item.lastModified && <span>Last Modified: {item.lastModified} | </span>}
                  {item.size && <span>Size: {item.size} KB</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state flex items-center justify-center text-gray-500">
          <IconInfoCircle stroke={1.75} className="mr-2" /> Select a folder or file to view contents
          or enter a search term...
        </div>
      )}
    </div>
  );

  return (
    <div
      ref={connect}
      style={style}
      className={cn(
        'file-manager flex flex-col  bg-white shadow rounded border border-gray-200',
        className,
        ...classNames,
      )}
    >
      <div className="w-full border-b border-gray-200 p-2 bg-gray-100 flex items-center">
        <div className="flex items-center space-x-2">
          <button className="flex text-gray-600 items-center space-x-1 px-4 py-2  rounded hover:bg-gray-600 hover:text-white">
            <IconDownload className="w-4 h-4" />
            <span>Download</span>
          </button>
          <button className="flex text-gray-600 items-center space-x-1 px-4 py-2  rounded hover:bg-gray-600 hover:text-white">
            <IconTrash className="w-4 h-4" />
            <span>Delete</span>
          </button>
        </div>
        <div className="flex text-gray-600 items-center space-x-2 ml-4">
          <IconSortAscending />
          Sort By:
          <select
            className="border border-gray-300 rounded"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="name">Name</option>
            <option value="size">Size</option>
          </select>
        </div>
        <div className="ml-auto flex items-center space-x-4">
          <input
            type="text"
            placeholder="Search files"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="border border-gray-300 rounded px-4 py-2 w-64"
          />
        </div>
      </div>

      <div className="flex flex-1">
        {renderNavigationPane()}
        {renderContentView()}
      </div>
    </div>
  );
};

export default FileManager;
