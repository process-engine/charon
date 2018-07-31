import {ForbiddenError, isError, UnauthorizedError} from '@essential-projects/errors_ts';
import {IManagementApiService, ManagementContext} from '@process-engine/management_api_contracts';
import {inject} from 'aurelia-framework';
import {
  IAuthenticationService,
  NotificationType,
} from '../../contracts/index';
import {NotificationService} from '../notification/notification.service';

@inject('ManagementApiClientService', 'NotificationService', 'AuthenticationService')
export class Dashboard {

  public showTaskList: boolean = false;
  public showProcessList: boolean = false;

  private _managementApiService: IManagementApiService;
  private _notificationService: NotificationService;
  private _authenticationService: IAuthenticationService;

  constructor(managementApiService: IManagementApiService,
              notificationService: NotificationService,
              authenticationService: IAuthenticationService,
  ) {
    this._managementApiService = managementApiService;
    this._notificationService = notificationService;
    this._authenticationService = authenticationService;
  }

  public async canActivate(): Promise<boolean> {
    const managementContext: ManagementContext = this._getManagementContext();

    const hasClaimsForTaskList: boolean = await this._hasClaimsForTaskList(managementContext);
    const hasClaimsForProcessList: boolean = await this._hasClaimsForProcessList(managementContext);

    if (!hasClaimsForProcessList && !hasClaimsForTaskList) {
      this._notificationService.showNotification(NotificationType.ERROR, 'You don\'t have the permission to use the dashboard features.');
      return false;
    }

    this.showTaskList = hasClaimsForTaskList;
    this.showProcessList = hasClaimsForProcessList;

    return true;
  }

  private async _hasClaimsForTaskList(managementContext: ManagementContext): Promise<boolean> {
    try {

      await this._managementApiService.getProcessModels(managementContext);
      await this._managementApiService.getUserTasksForProcessModel(managementContext, undefined);
      await this._managementApiService.getUserTasksForCorrelation(managementContext, undefined);
      await this._managementApiService.getAllActiveCorrelations(managementContext);
      await this._managementApiService.getProcessModelById(managementContext, undefined);

    } catch (error) {
      const errorIsForbiddenError: boolean = isError(error, ForbiddenError);
      const errorIsUnauthorizedError: boolean = isError(error, UnauthorizedError);

      if (errorIsForbiddenError || errorIsUnauthorizedError) {
        return false;
      }
    }

    return true;
  }

  private async _hasClaimsForProcessList(managementContext: ManagementContext): Promise<boolean> {
    try {

      await this._managementApiService.getAllActiveCorrelations(managementContext);

    } catch (error) {
      const errorIsForbiddenError: boolean = isError(error, ForbiddenError);
      const errorIsUnauthorizedError: boolean = isError(error, UnauthorizedError);

      if (errorIsForbiddenError || errorIsUnauthorizedError) {
        return false;
      }
    }

    return true;
  }

  // TODO: Move this method into a service.
  private _getManagementContext(): ManagementContext {
    const accessToken: string = this._authenticationService.getAccessToken();
    const context: ManagementContext = {
      identity: accessToken,
    };

    return context;
  }
}
