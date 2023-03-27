import React from 'react';
import { IconType } from 'react-icons/lib';
import { RiQuestionAnswerFill, RiStarFill } from 'react-icons/ri';
import { Link, useRoute } from 'wouter';
import classNames from 'classnames';

export const NavMenu = () => {
  return (
    <div className="flex w-full flex-grow flex-col">
      <NavMenuItem
        routeLabel="Chat"
        routeIcon={RiQuestionAnswerFill}
        route="/chat"
      />
      <NavMenuItem
        routeLabel="Favorites"
        routeIcon={RiStarFill}
        route="/favorites"
      />
    </div>
  );
};

const NavMenuItem = ({
  routeLabel,
  route,
  routeIcon,
}: {
  routeLabel: string;
  route: string;
  routeIcon: IconType;
}) => {
  const [match, params] = useRoute(route);

  return (
    <div
      className={classNames('w-full rounded-lg px-5 py-3', {
        'pointer-events-none bg-indigo-200': match,
      })}
    >
      <Link href={route} className="group inline-flex items-center gap-1">
        {React.createElement(routeIcon, {
          className: classNames('h-5 w-5 group-hover:text-indigo-600', {
            'text-indigo-600': match,
            'text-slate-600': !match,
          }),
        })}

        <h1
          className={classNames('group-hover:text-indigo-600', {
            'text-indigo-600': match,
            'text-slate-600': !match,
          })}
        >
          {routeLabel}
        </h1>
      </Link>
    </div>
  );
};
