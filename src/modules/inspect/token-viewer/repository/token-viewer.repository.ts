import {inject} from 'aurelia-framework';

import {IIdentity} from '@essential-projects/iam_contracts';
import {DataModels, IManagementApiClient} from '@process-engine/management_api_contracts';

import {ITokenViewerRepository} from '../contracts';

@inject('ManagementApiClientService')
export class TokenViewerRepository implements ITokenViewerRepository {
  protected managementApiService: IManagementApiClient;

  constructor(managementApiService: IManagementApiClient) {
    this.managementApiService = managementApiService;
  }

  public async getTokenForFlowNodeInstance(
    processModelId: string,
    correlationId: string,
    flowNodeId: string,
    identity: IIdentity,
  ): Promise<DataModels.TokenHistory.TokenHistoryEntryList> {
    const tokenHistoryEntries: Array<
      DataModels.TokenHistory.TokenHistoryEntry
    > = (await this.managementApiService.getTokensForFlowNode(
      identity,
      correlationId,
      processModelId,
      flowNodeId,
    )) as any;

    const tokenHistoryEntryList: DataModels.TokenHistory.TokenHistoryEntryList = {
      tokenHistoryEntries: tokenHistoryEntries,
      totalCount: tokenHistoryEntries.length,
    };

    return tokenHistoryEntryList;
  }

  public async getTokenForFlowNodeByProcessInstanceId(
    processInstanceId: string,
    flowNodeId: string,
    identity: IIdentity,
  ): Promise<DataModels.TokenHistory.TokenHistoryGroup> {
    return this.managementApiService.getTokensForFlowNodeByProcessInstanceId(identity, processInstanceId, flowNodeId);
  }
}
