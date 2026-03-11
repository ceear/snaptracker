import DatePicker from 'react-datepicker';
import { fromUnixTime, parseISO } from 'date-fns';
import 'react-datepicker/dist/react-datepicker.css';

export default function CalendarWidget({ dates, currentImage, onDateSelect }) {
  const highlightedDates = dates.map(d => parseISO(d));
  const selectedDate = currentImage ? fromUnixTime(currentImage.captured_at) : null;

  return (
    <div className="flex justify-center">
      <DatePicker
        inline
        selected={selectedDate}
        highlightDates={highlightedDates}
        onChange={(date) => {
          if (date) {
            const iso = date.toISOString().split('T')[0];
            onDateSelect(iso);
          }
        }}
        calendarClassName="!text-xs"
      />
    </div>
  );
}
