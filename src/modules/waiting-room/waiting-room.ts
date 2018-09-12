import {
  Correlation,
  IManagementApiService,
  ManagementContext,
  UserTask,
  UserTaskList,
} from '@process-engine/management_api_contracts';
import {inject} from 'aurelia-framework';
import {activationStrategy, Router} from 'aurelia-router';
import {IAuthenticationService, NotificationType} from '../../contracts/index';
import environment from '../../environment';
import {NotificationService} from '../notification/notification.service';

interface RouteParameters {
  correlationId: string;
  processModelId: string;
}

@inject(Router, 'NotificationService', 'AuthenticationService', 'ManagementApiClientService')
export class WaitingRoom {

  private _router: Router;
  private _correlationId: string;
  private _notificationService: NotificationService;
  private _authenticationService: IAuthenticationService;
  private _managementApiClient: IManagementApiService;
  private _pollingTimer: NodeJS.Timer;
  private _processModelId: string;
  private _maxPollingRetryCount: number = 5;

  constructor(router: Router,
              notificationService: NotificationService,
              authenticationService: IAuthenticationService,
              managementApiClient: IManagementApiService) {

    this._router = router;
    this._notificationService = notificationService;
    this._authenticationService = authenticationService;
    this._managementApiClient = managementApiClient;
  }

  public activate(routeParameters: RouteParameters): void {
    this._correlationId = routeParameters.correlationId;
    this._processModelId = routeParameters.processModelId;
  }

  public attached(): void {
    this._startPolling(0);
  }

  public detached(): void {
    this._stopPolling();
  }

  public determineActivationStrategy(): string {
    return activationStrategy.replace;
  }

  public navigateToDetailView(): void {
    this._router.navigateToRoute('processdef-detail', {
      processModelId: this._processModelId,
    });
  }

  private async _startPolling(retryCount: number): Promise<void> {
    this._pollingTimer = setTimeout(async() => {
      const userTaskFound: boolean = await this._pollUserTasksForCorrelation();
      const correlationIsStillActive: boolean = await this._pollIsCorrelationStillActive(retryCount);

      if (userTaskFound) {
        return;
      }

      retryCount = correlationIsStillActive ? 0 : retryCount + 1;

      this._startPolling(retryCount);

    }, environment.processengine.waitingRoomPollingIntervalInMs);
  }

  private _stopPolling(): void {
    clearTimeout(this._pollingTimer);
  }

  private async _pollUserTasksForCorrelation(): Promise<boolean> {

    const managementContext: ManagementContext = this._getManagementContext();
    const userTasksForCorrelation: UserTaskList = await this._managementApiClient.getUserTasksForCorrelation(managementContext,
                                                                                                             this._correlationId);

    const userTaskListHasNoUserTask: boolean = userTasksForCorrelation.userTasks.length <= 0;
    if (userTaskListHasNoUserTask) {
      return false;
    }

    const nextUserTask: UserTask = userTasksForCorrelation.userTasks[0];

    this._renderUserTaskCallback(nextUserTask);
    return true;
  }

  private async _pollIsCorrelationStillActive(retryCount: number): Promise<boolean> {

    const managementContext: ManagementContext = this._getManagementContext();
    const allActiveCorrelations: Array<Correlation> = await this._managementApiClient.getAllActiveCorrelations(managementContext);

    const correlationIsNotActive: boolean = !allActiveCorrelations.some((activeCorrelation: Correlation) => {
      return activeCorrelation.id === this._correlationId;
    });

    if (correlationIsNotActive && retryCount >= this._maxPollingRetryCount) {
      this._correlationEndCallback();
    }

    return !correlationIsNotActive;
  }

  private _renderUserTaskCallback(userTask: UserTask): void {
    this._notificationService.showNotification(NotificationType.SUCCESS, 'Process continued.');

    this._router.navigateToRoute('task-dynamic-ui', {
      processModelId: userTask.processModelId,
      userTaskId: userTask.id,
    });
  }

  private _correlationEndCallback: ((correlationId: string) => void) = (correlationId: string): void => {
    this._notificationService.showNotification(NotificationType.INFO, 'Process stopped.');

    this._router.navigateToRoute('dashboard');
  }

  private _getManagementContext(): ManagementContext {
    const accessToken: string = this._authenticationService.getAccessToken();
    const context: ManagementContext = {
      identity: accessToken,
    };

    return context;
  }
}
