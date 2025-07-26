import React from 'react';
import { TimePicker } from 'antd';
import type { RangePickerTimeProps } from 'antd/es/time-picker';
import 'antd/dist/reset.css';
import dayjs from 'dayjs';
import './UnifiedTimeRangePicker.css';

interface UnifiedTimeRangePickerProps extends Omit<RangePickerTimeProps<dayjs.Dayjs>, 'value' | 'onChange'> {
  value?: [string, string] | null;
  onChange?: (value: [string, string] | null) => void;
  disabled?: boolean;
  className?: string;
  size?: 'small' | 'middle' | 'large';
}

const UnifiedTimeRangePicker: React.FC<UnifiedTimeRangePickerProps> = ({
  value,
  onChange,
  disabled = false,
  className = '',
  size = 'middle',
  ...props
}) => {
  return (
    <TimePicker.RangePicker
      format="HH:mm"
      value={value ? [dayjs(value[0], 'HH:mm'), dayjs(value[1], 'HH:mm')] : null}
      onChange={(times) => {
        if (!times || times.length !== 2 || !times[0] || !times[1]) {
          onChange?.(null);
        } else {
          onChange?.([
            times[0].format('HH:mm'),
            times[1].format('HH:mm'),
          ]);
        }
      }}
      allowClear
      minuteStep={5}
      disabled={disabled}
      className={`w-full rtl custom-timepicker-placeholder ${className}`}
      size={size}
      classNames={{ popup: { root: 'rtl' } }}
      {...props}
      style={{ direction: 'rtl', ...props.style }}
      placeholder={["من", "إلى"]}
    />
  );
};

export default UnifiedTimeRangePicker; 