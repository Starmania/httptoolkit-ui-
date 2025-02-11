import * as React from 'react';
import { observable, action, reaction, computed } from 'mobx';
import { observer, disposeOnUnmount } from 'mobx-react';
import * as portals from 'react-reverse-portal';

import { RawHeaders } from '../../../types';
import {
    isProbablyUtf8,
    bufferToString,
    stringToBuffer
} from '../../../util';
import { getHeaderValue } from '../../../util/headers';
import {
    EditableContentType,
    EditableContentTypes,
    getEditableContentType
} from '../../../model/events/content-types';

import { CollapsibleCard } from '../../common/card';
import { SelfSizedEditor } from '../../editor/base-editor';
import { EditableBodyCardHeader, EditorCardContent } from '../../editor/body-card-components';

@observer
export class HttpBreakpointBodyCard extends React.Component<{
    title: string,
    direction: 'left' | 'right',
    collapsed: boolean,
    expanded: boolean,
    onCollapseToggled: () => void,
    onExpandToggled: () => void,

    exchangeId: string,
    body: Buffer,
    rawHeaders: RawHeaders,
    onChange: (result: Buffer) => void,
    editorNode: portals.HtmlPortalNode<typeof SelfSizedEditor>;
}> {

    @observable
    private contentType: EditableContentType = 'text';

    @action.bound
    onChangeContentType(value: string) {
        this.contentType = value as EditableContentType;
    }

    componentDidMount() {
        // If the content header is changed (manually, or when switching requests), update the
        // selected editor content type to match:
        disposeOnUnmount(this, reaction(
            () => getHeaderValue(this.props.rawHeaders, 'content-type'),
            (contentTypeHeader) => {
                this.contentType = getEditableContentType(contentTypeHeader) || 'text';
            },
            { fireImmediately: true }
        ));
    }

    @computed
    private get textEncoding() {
        // If we're handling text data, we want to show & edit it as UTF8.
        // If it's binary, that's a lossy operation, so we use binary (latin1) instead.
        return isProbablyUtf8(this.props.body)
            ? 'utf8'
            : 'binary';
    }

    render() {
        const {
            body,
            title,
            exchangeId,
            direction,
            collapsed,
            expanded,
            onCollapseToggled,
            onExpandToggled
        } = this.props;

        const bodyString = bufferToString(body, this.textEncoding);

        return <CollapsibleCard
            direction={direction}
            collapsed={collapsed}
            onCollapseToggled={onCollapseToggled}
            expanded={expanded}
        >
            <header>
                <EditableBodyCardHeader
                    body={body}
                    onBodyFormatted={this.onBodyChange}

                    title={title}
                    expanded={expanded}
                    onExpandToggled={onExpandToggled}
                    onCollapseToggled={onCollapseToggled}

                    selectedContentType={this.contentType}
                    contentTypeOptions={EditableContentTypes}
                    onChangeContentType={this.onChangeContentType}
                />
            </header>
            <EditorCardContent>
                <portals.OutPortal<typeof SelfSizedEditor>
                    contentId={`bp-${exchangeId}-${direction}`}
                    node={this.props.editorNode}
                    language={this.contentType}
                    value={bodyString}
                    onChange={this.onBodyChange}
                    expanded={expanded}
                />
            </EditorCardContent>
        </CollapsibleCard>;
    }

    private onBodyChange = (body: string) => {
        this.props.onChange(stringToBuffer(body, this.textEncoding));
    }

}