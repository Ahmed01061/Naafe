import React from 'react';
import Breadcrumb from '../Breadcrumb';

interface HelpCenterBreadcrumbProps {
  items: Array<{ label: string; href?: string; active?: boolean }>;
}

const HelpCenterBreadcrumb: React.FC<HelpCenterBreadcrumbProps> = ({ items }) => {
  return <Breadcrumb items={items} />;
};

export default HelpCenterBreadcrumb; 