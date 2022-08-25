import { Component } from 'react';
import DataBrowser, {
    ColumnDef
} from '../../../components/DataBrowser';
import { PluginsInfo, PluginInfo } from '../../../types/info';

export interface AboutPluginsProps {
    pluginsInfo: PluginsInfo;
}

interface AboutPluginsState { }

export default class AboutPlugins extends Component<
    AboutPluginsProps,
    AboutPluginsState
> {
    renderPlugins() {
        const columns: Array<ColumnDef<PluginInfo>> = [
            {
                id: 'name',
                label: 'Name',
                style: {},
                render: (plugin: PluginInfo) => {
                    return <span>{plugin.configs.ui.name}</span>;
                },
                sorter: (a: PluginInfo, b: PluginInfo) => {
                    return a.configs.ui.name.localeCompare(b.configs.ui.name);
                },
            },
            {
                id: 'version',
                label: 'Version',
                style: {},
                render: (plugin: PluginInfo) => {
                    return <span>{plugin.configs.ui.version}</span>;
                },
                sorter: (a: PluginInfo, b: PluginInfo) => {
                    return a.configs.ui.version.localeCompare(b.configs.ui.version);
                },
            },
            // {
            //     id: 'date',
            //     label: 'Date',
            //     style: {},
            //     render: (plugin: PluginInfo) => {
            //         return (
            //             <span>
            //                 {Intl.DateTimeFormat('en-US', {}).format(
            //                     new Date(plugin.git.committer.date)
            //                 )}
            //             </span>
            //         );
            //     },
            //     sorter: (a: PluginInfo, b: PluginInfo) => {
            //         return (
            //             new Date(a.git.committer.date).getTime() -
            //             new Date(b.git.committer.date).getTime()
            //         );
            //     },
            // },
            // {
            //     id: 'account',
            //     label: 'GitHub Account',
            //     style: {},
            //     render: (plugin: PluginInfo) => {
            //         return <span>{plugin.git.account}</span>;
            //     },
            // },
            // {
            //     id: 'repoName',
            //     label: 'Repo',
            //     style: {}, 
            //     render: (plugin: PluginInfo) => {
            //         return (
            //             <a href={plugin.git.originURL} target="_blank" rel="noreferrer" title={plugin.git.originURL}>
            //                 {plugin.git.repoName}
            //             </a>
            //         );
            //     },
            // },
        ];

        const data: Array<PluginInfo> = this.props.pluginsInfo.map(
            (value) => {
                return value;
            }
        );

        return (
            <DataBrowser
                columns={columns}
                heights={{ header: 50, row: 50 }}
                dataSource={data}
            />
        );
    }

    render() {
        return <div className="well main">
            <div className="well-body">
                {this.renderPlugins()}
            </div>
        </div>;
    }
}
