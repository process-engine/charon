import {IIdentity} from '@essential-projects/iam_contracts';
import {DataModels} from '@process-engine/management_api_contracts';

import {ITokenViewerRepository} from '../contracts';
import {TokenViewerRepository} from './token-viewer.repository';

export class TokenViewerPaginationRepository extends TokenViewerRepository implements ITokenViewerRepository {
  public async getTokenForFlowNodeInstance(
    processModelId: string,
    correlationId: string,
    flowNodeId: string,
    identity: IIdentity,
  ): Promise<DataModels.TokenHistory.TokenHistoryEntryList> {
    return this.managementApiService.getTokensForFlowNode(identity, correlationId, processModelId, flowNodeId);
  }
}
