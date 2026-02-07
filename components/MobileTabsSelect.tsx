import { ChevronDown } from 'lucide-react';
import { SelectPersonalizado } from './SelectPersonalizado';

interface MobileTabsSelectOption {
    value: string;
    label: string;
}

interface MobileTabsSelectProps {
    value: string;
    onChange: (value: string) => void;
    options: MobileTabsSelectOption[];
    label?: string;
    className?: string;
    id?: string;
}

export const MobileTabsSelect: React.FC<MobileTabsSelectProps> = ({
    value,
    onChange,
    options,
    label = 'Seção',
    className = '',
    id
}) => {
    const selectId = id || `mobile-tabs-${label.replace(/\s+/g, '-').toLowerCase()}`;

    return (
        <div className={`md:hidden ${className}`}>
            <SelectPersonalizado
                id={selectId}
                value={value}
                onChange={onChange}
                options={options}
                label={label}
            />
        </div>
    );
};
