// This file is part of the JACoW plugin.
// Copyright (C) 2021 - 2026 CERN
//
// The CERN Indico plugins are free software; you can redistribute
// them and/or modify them under the terms of the MIT License; see
// the LICENSE file for more details.

import mailingListSubscribeURL from 'indico-url:plugin_jacow.user_mailing_lists_subscribe';
import mailingListUnsubscribeURL from 'indico-url:plugin_jacow.user_mailing_lists_unsubscribe';

import PropTypes from 'prop-types';
import React, {useState} from 'react';
import ReactDOM from 'react-dom';
import {ListItem, ListContent, List, Checkbox} from 'semantic-ui-react';

import {indicoAxios, handleAxiosError} from 'indico/utils/axios';

import './MailingList.module.scss';

export function MailingList({mailingLists}) {
  const [listGroups, setListGroups] = useState(mailingLists.list_groups);
  const [listsLoadingRequests, setListsLoadingRequests] = useState(new Set());

  const lists = listGroups.flatMap(group => group.lists);
  const userIdArgs = mailingLists.user_id !== null ? {user_id: mailingLists.user_id} : {};

  const subscribeList = async list => {
    await indicoAxios.post(mailingListSubscribeURL(userIdArgs), list);
  };

  const unsubscribeList = async list => {
    await indicoAxios.post(mailingListUnsubscribeURL(userIdArgs), list);
  };

  const handleToggle = async (ev, {value}) => {
    if (listsLoadingRequests.has(value)) return;

    setListsLoadingRequests(prev => new Set(prev).add(value));

    const targetList = lists.find(list => list.id === value);
    const newSubscriptionStatus = !targetList.subscribed;

    setListGroups(prevListGroups =>
      prevListGroups.map(group => ({
        ...group,
        lists: group.lists.map(list =>
          list.id === value ? {...list, subscribed: newSubscriptionStatus} : list
        ),
      }))
    );

    try {
      if (newSubscriptionStatus) {
        await subscribeList({list_id: value});
      } else {
        await unsubscribeList({list_id: value});
      }
    } catch (e) {
      handleAxiosError(e);
      setListGroups(prevListGroups =>
        prevListGroups.map(group => ({
          ...group,
          lists: group.lists.map(list =>
            list.id === value ? {...list, subscribed: !newSubscriptionStatus} : list
          ),
        }))
      );
    } finally {
      setListsLoadingRequests(prev => {
        const newSet = new Set(prev);
        newSet.delete(value);
        return newSet;
      });
    }
  };

  return (
    <div className="i-box-group vert" style={{marginTop: '15px'}}>
      {listGroups.map(({key, title, lists: groupLists}) => (
        <div className="i-box" key={key}>
          <div className="i-box-header">
            <div className="i-box-title">{title}</div>
          </div>
          <div className="i-box-content">
            <List divided relaxed size="big">
              {groupLists.map(list => (
                <ListItem styleName="mailing" key={list.id}>
                  <ListContent>{list.name}</ListContent>
                  <ListContent>
                    <Checkbox
                      toggle
                      value={list.id}
                      onChange={handleToggle}
                      disabled={listsLoadingRequests.has(list.id)}
                      checked={list.subscribed}
                    />
                  </ListContent>
                </ListItem>
              ))}
            </List>
          </div>
        </div>
      ))}
    </div>
  );
}

MailingList.propTypes = {
  mailingLists: PropTypes.shape({
    list_groups: PropTypes.arrayOf(
      PropTypes.shape({
        key: PropTypes.string.isRequired,
        title: PropTypes.string.isRequired,
        lists: PropTypes.arrayOf(
          PropTypes.shape({
            id: PropTypes.number.isRequired,
            name: PropTypes.string.isRequired,
            subscribed: PropTypes.bool.isRequired,
          })
        ).isRequired,
      })
    ).isRequired,
    user_id: PropTypes.number,
  }).isRequired,
};

window.setupMailingList = (elem, subMailingLists) => {
  subMailingLists = JSON.parse(subMailingLists);
  ReactDOM.render(<MailingList mailingLists={subMailingLists} />, elem);
};
