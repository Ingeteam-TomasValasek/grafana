import angular from 'angular';
import _ from 'lodash';
import appEvents from 'app/core/app_events';

export let iconMap = {
  'time range': 'fa-clock-o',
};

export function timeToString(aHour, aMinute) {
  if (aHour % 1 === 0 && aMinute % 1 === 0 && aHour < 24 && aHour >= 0 && aMinute < 60 && aMinute >= 0) {
    if (aHour.toString().length === 1) {
      aHour = '0' + aHour;
    }
    if (aMinute.toString().length === 1) {
      aMinute = '0' + aMinute;
    }
    const TimeString = aHour + ':' + aMinute;
    return TimeString;
  }
  throw new Error('Invalid input');
}

export class CustomTimeRangeEditorCtrl {
  dashboard: any;
  iconMap: any;
  mode: any;
  range: any;
  form: any;
  days: any;
  customReload: any;

  /** @ngInject */
  constructor($scope, $rootScope) {
    this.iconMap = iconMap;
    this.dashboard.ranges = this.dashboard.ranges || [];
    this.dashboard.day = this.dashboard.day;
    this.dashboard.week = this.dashboard.week;
    this.dashboard.customReload = this.dashboard.customReload;
    this.mode = 'list';
    this.days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    $scope.$on('$destroy', () => {
      $rootScope.appEvent('custom-ranges-updated');
    });
  }

  isValid = () => {
    if (!this.form.$valid) {
      return false;
    }

    const sameName = _.find(this.dashboard.ranges, { name: this.range.name });
    if (sameName && sameName !== this.range) {
      appEvents.emit('alert-warning', ['Validation', 'Time Range with the same name already exists']);
      return false;
    }

    return true;
  };

  backToList() {
    this.mode = 'list';
  }

  setupNew() {
    this.mode = 'new';
    this.range = { type: 'shift', icon: 'time range' };
  }

  addRange() {
    if (this.isValid()) {
      this.range.from = timeToString(this.range.fromHour, this.range.fromMin);
      this.range.to = timeToString(this.range.toHour, this.range.toMin);
      this.dashboard.ranges.push(this.range);
      this.mode = 'list';
    }
  }

  editRange(aRange) {
    this.range = aRange;
    this.mode = 'edit';
  }

  saveRange() {
    if (this.isValid()) {
      this.range.from = timeToString(this.range.fromHour, this.range.fromMin);
      this.range.to = timeToString(this.range.toHour, this.range.toMin);
      this.backToList();
    }
  }

  moveRange(aIndex, aDir) {
    _.move(this.dashboard.ranges, aIndex, aIndex + aDir);
  }

  deleteRange(aIndex) {
    this.dashboard.ranges.splice(aIndex, 1);
    this.dashboard.updateSubmenuVisibility();
  }

  editDay() {
    this.mode = 'edit-Day';
    //this.dashboard.day = 'DAY!!!!'
  }
  saveDay() {
    this.dashboard.day.from = timeToString(this.dashboard.day.fromHour, this.dashboard.day.fromMin);
    this.dashboard.day.to = timeToString(this.dashboard.day.toHour, this.dashboard.day.toMin);
    this.backToList();
  }
  editWeek() {
    this.mode = 'edit-Week';
    //this.dashboard.week = 'DAY!!!!'
  }
  saveWeek() {
    this.dashboard.week.from = timeToString(this.dashboard.week.fromHour, this.dashboard.week.fromMin);
    this.dashboard.week.to = timeToString(this.dashboard.week.toHour, this.dashboard.week.toMin);
    this.backToList();
  }
}

function customRangeEditor() {
  return {
    restrict: 'E',
    controller: CustomTimeRangeEditorCtrl,
    templateUrl: 'public/app/features/dashboard/custom_time_ranges/editor.html',
    bindToController: true,
    controllerAs: 'ctrl',
    scope: {
      dashboard: '=',
    },
  };
}

angular.module('grafana.directives').directive('customRangeEditor', customRangeEditor);
