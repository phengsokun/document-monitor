import { useState, useMemo } from 'react';
import { getStatus, formatDueDate } from '../lib/dueDateCheck';

const MONTHS_KM = [
  'មករា', 'កុម្ភៈ', 'មីនា', 'មេសា', 'ឧសភា', 'មិថុនា',
  'កក្កដា', 'សីហា', 'កញ្ញា', 'តុលា', 'វិច្ឆិកា', 'ធ្នូ',
];

const DAYS_KM = ['ចន្ទ', 'អង្គារ', 'ពុធ', 'ព្រហ', 'សុក្រ', 'សៅរ៍', 'អាទិត្យ'];

const STATUS_COLORS = {
  overdue: 'bg-red-500',
  pending: 'bg-blue-500',
  request_data: 'bg-orange-500',
  completed: 'bg-green-500',
};

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getStartDayOfWeek(year, month) {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1;
}

export default function CalendarView({ documents, onEdit, search, onSearchChange }) {
  const today = new Date();
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [viewYear, setViewYear] = useState(today.getFullYear());

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const goToToday = () => {
    setViewMonth(today.getMonth());
    setViewYear(today.getFullYear());
  };

  const filteredDocs = useMemo(() => {
    let result = documents;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((d) =>
        d.trackingNumber?.toLowerCase().includes(q) ||
        d.requestorName?.toLowerCase().includes(q) ||
        d.documentType?.toLowerCase().includes(q) ||
        d.district?.toLowerCase().includes(q) ||
        String(d.id).includes(q)
      );
    }
    return result;
  }, [documents, search]);

  const docsByDate = useMemo(() => {
    const map = {};
    for (const doc of filteredDocs) {
      if (!doc.dueDate) continue;
      const dateKey = doc.dueDate;
      if (!map[dateKey]) map[dateKey] = [];
      map[dateKey].push(doc);
    }
    return map;
  }, [filteredDocs]);

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const startDay = getStartDayOfWeek(viewYear, viewMonth);

  const todayStr = today.toISOString().split('T')[0];

  const cells = [];
  let day = 1;

  for (let row = 0; row < 6; row++) {
    for (let col = 0; col < 7; col++) {
      if (row === 0 && col < startDay) {
        cells.push(null);
      } else if (day > daysInMonth) {
        cells.push(null);
      } else {
        const monthStr = String(viewMonth + 1).padStart(2, '0');
        const dayStr = String(day).padStart(2, '0');
        const dateKey = `${viewYear}-${monthStr}-${dayStr}`;
        cells.push({ day, dateKey });
        day++;
      }
    }
  }

  while (cells.length > 0 && cells[cells.length - 1] === null) {
    cells.pop();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="ស្វែងរក..."
          className="flex-1 min-w-[200px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
          <button onClick={prevMonth}
            className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 text-sm font-medium">
            &larr; ខែមុន
          </button>
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-gray-800">
              {MONTHS_KM[viewMonth]} {viewYear}
            </h2>
            <button onClick={goToToday}
              className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 font-medium">
              ថ្ងៃនេះ
            </button>
          </div>
          <button onClick={nextMonth}
            className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 text-sm font-medium">
            ខែក្រោយ &rarr;
          </button>
        </div>

        <div className="grid grid-cols-7">
          {DAYS_KM.map((d) => (
            <div key={d} className="px-2 py-2 text-center text-xs font-semibold text-gray-500 bg-gray-50 border-b border-gray-200">
              {d}
            </div>
          ))}

          {cells.map((cell, i) => {
            if (!cell) {
              return <div key={`empty-${i}`} className="border-b border-r border-gray-100 bg-gray-50/50" />;
            }

            const docs = docsByDate[cell.dateKey] || [];
            const isToday = cell.dateKey === todayStr;

            return (
              <div key={cell.dateKey}
                className={`border-b border-r border-gray-100 min-h-[100px] p-1.5 ${
                  isToday ? 'bg-blue-50/60 ring-1 ring-inset ring-blue-300' : ''
                }`}>
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full ${
                    isToday ? 'bg-blue-600 text-white' : 'text-gray-600'
                  }`}>
                    {cell.day}
                  </span>
                  {docs.length > 0 && (
                    <span className="text-xs text-gray-400">{docs.length}</span>
                  )}
                </div>
                <div className="space-y-0.5">
                  {docs.slice(0, 3).map((doc) => {
                    const status = getStatus(doc);
                    return (
                      <button
                        key={doc.id}
                        onClick={() => onEdit(doc)}
                        className={`w-full text-left text-xs px-1.5 py-0.5 rounded ${STATUS_COLORS[status] || 'bg-gray-400'} text-white truncate block hover:opacity-80 transition-opacity`}
                        title={`${doc.trackingNumber || 'N/A'} - ${doc.requestorName}`}
                      >
                        {doc.trackingNumber || doc.requestorName}
                      </button>
                    );
                  })}
                  {docs.length > 3 && (
                    <div className="text-xs text-gray-400 px-1">+{docs.length - 3} ទៀត</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
